import { defaultStatusText, httpError, isHttpError } from "./errors.js";
import { createRoute, hasPathMatch, matchRoute, type Route } from "./router.js";
import type { App, Context, CreateAppOptions, Handler, HttpMethod, Middleware } from "./types.js";

const METHODS: readonly HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

export function createApp<State = undefined>(options: CreateAppOptions<State> = {}): App<State> {
  const routes: Route<State>[] = [];
  const middleware: Middleware<State>[] = [];

  const app: App<State> = {
    fetch: async (request) => dispatch(request, routes, middleware, options),
    use: (entry) => {
      middleware.push(entry);
      return app;
    },
    route: (method, path, handler) => {
      assertMethod(method);
      routes.push(createRoute(method, path, handler));
      return app;
    },
    get: (path, handler) => app.route("GET", path, handler),
    post: (path, handler) => app.route("POST", path, handler),
    put: (path, handler) => app.route("PUT", path, handler),
    patch: (path, handler) => app.route("PATCH", path, handler),
    delete: (path, handler) => app.route("DELETE", path, handler),
    head: (path, handler) => app.route("HEAD", path, handler),
    options: (path, handler) => app.route("OPTIONS", path, handler),
  };

  return app;
}

async function dispatch<State>(
  request: Request,
  routes: readonly Route<State>[],
  middleware: readonly Middleware<State>[],
  options: CreateAppOptions<State>,
): Promise<Response> {
  const url = new URL(request.url);
  const state = await resolveState(request, options);
  const baseContext: Context<State> = {
    request,
    url,
    params: Object.create(null) as Record<string, string>,
    state,
  };

  try {
    const match = matchRoute(routes, request.method, url.pathname);
    const handler = match?.route.handler ?? createFallbackHandler(routes, options.notFound);
    const context: Context<State> = match === undefined ? baseContext : { ...baseContext, params: match.params };
    const response = await runMiddleware(context, middleware, () => handler(context));
    return request.method === "HEAD" ? withoutBody(response) : response;
  } catch (error) {
    return handleError(error, baseContext, options);
  }
}

async function resolveState<State>(request: Request, options: CreateAppOptions<State>): Promise<State> {
  const state = options.state;

  if (typeof state === "function") {
    return (state as (request: Request) => State | Promise<State>)(request);
  }

  return state as State;
}

function createFallbackHandler<State>(routes: readonly Route<State>[], notFound: Handler<State> | undefined): Handler<State> {
  return (context) => {
    if (hasPathMatch(routes, context.url.pathname)) {
      throw httpError(405);
    }

    if (notFound !== undefined) {
      return notFound(context);
    }

    throw httpError(404);
  };
}

function runMiddleware<State>(
  context: Context<State>,
  middleware: readonly Middleware<State>[],
  handler: () => Promise<Response> | Response,
): Promise<Response> {
  let index = -1;

  const next = async (): Promise<Response> => {
    index += 1;
    const entry = middleware[index];

    if (entry === undefined) {
      return handler();
    }

    return entry(context, next);
  };

  return next();
}

async function handleError<State>(error: unknown, context: Context<State>, options: CreateAppOptions<State>): Promise<Response> {
  if (options.onError !== undefined) {
    return options.onError(error, context);
  }

  if (isHttpError(error)) {
    return new Response(error.message, {
      status: error.status,
      headers: {
        "content-type": "text/plain; charset=utf-8",
      },
    });
  }

  return new Response(defaultStatusText(500), {
    status: 500,
    headers: {
      "content-type": "text/plain; charset=utf-8",
    },
  });
}

function withoutBody(response: Response): Response {
  return new Response(null, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

function assertMethod(method: HttpMethod): void {
  if (!METHODS.includes(method)) {
    throw httpError(400, "Unsupported HTTP method");
  }
}
