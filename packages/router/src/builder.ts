import { RouterError, fail } from "./errors.js";
import { buildPath, extractParamNames, joinPaths, matchPath, parsePath, type PathSegment } from "./path.js";
import type {
  Route,
  RouteManifestEntry,
  RouteMatch,
  RouteMethod,
  RouteScopeOptions,
  Router,
  RoutesBuilder,
  ScopeBuilder,
} from "./types.js";

interface InternalRoute<Handler> extends Route<Handler> {
  readonly segments: readonly PathSegment[];
}

export function defineRoutes<Handler = unknown>(define: (routes: RoutesBuilder<Handler>) => void): Router<Handler> {
  const routes: InternalRoute<Handler>[] = [];
  const pipelines = new Set<string>();
  const builder = createBuilder(routes, pipelines, "/", []);

  define(builder);

  const frozenRoutes = routes.map(freezeInternalRoute);
  const publicRoutes = Object.freeze(frozenRoutes.map(toPublicRoute));

  return {
    routes: publicRoutes,
    manifest: () => frozenRoutes.map(toManifestEntry),
    match: (method, path) => matchRoute(frozenRoutes, method, path),
    path: (name, params) => buildNamedPath(frozenRoutes, name, params),
  };
}

function createBuilder<Handler>(
  routes: InternalRoute<Handler>[],
  pipelines: Set<string>,
  prefix: string,
  activePipelines: readonly string[],
): RoutesBuilder<Handler> {
  const scope: ScopeBuilder<Handler> = (
    path: string,
    optionsOrDefine: RouteScopeOptions | ((routes: RoutesBuilder<Handler>) => void),
    maybeDefine?: (routes: RoutesBuilder<Handler>) => void,
  ) => {
    const options = typeof optionsOrDefine === "function" ? {} : optionsOrDefine;
    const define = typeof optionsOrDefine === "function" ? optionsOrDefine : maybeDefine;

    if (define === undefined) {
      fail("Expected scope callback");
    }

    const nextPipelines = activePipelines.concat(normalizePipes(options.pipe));

    for (const pipe of nextPipelines) {
      if (!pipelines.has(pipe)) {
        fail(`Unknown pipeline: ${pipe}`);
      }
    }

    define(createBuilder(routes, pipelines, joinPaths(prefix, path), nextPipelines));
    return builder;
  };

  const builder: RoutesBuilder<Handler> = {
    pipeline: (name) => {
      validateName(name, "pipeline name");

      if (pipelines.has(name)) {
        fail(`Duplicate pipeline: ${name}`);
      }

      pipelines.add(name);
      return builder;
    },
    scope,
    route: (method, name, path, handler) => {
      addRoute(routes, {
        method,
        name,
        path: joinPaths(prefix, path),
        handler,
        pipelines: activePipelines,
      });
      return builder;
    },
    get: (name, path, handler) => builder.route("GET", name, path, handler),
    post: (name, path, handler) => builder.route("POST", name, path, handler),
    put: (name, path, handler) => builder.route("PUT", name, path, handler),
    patch: (name, path, handler) => builder.route("PATCH", name, path, handler),
    delete: (name, path, handler) => builder.route("DELETE", name, path, handler),
    head: (name, path, handler) => builder.route("HEAD", name, path, handler),
    options: (name, path, handler) => builder.route("OPTIONS", name, path, handler),
  };

  return builder;
}

function addRoute<Handler>(
  routes: InternalRoute<Handler>[],
  route: {
    readonly method: RouteMethod;
    readonly name: string;
    readonly path: string;
    readonly handler: Handler;
    readonly pipelines: readonly string[];
  },
): void {
  validateMethod(route.method);
  validateName(route.name, "route name");

  if (routes.some((entry) => entry.name === route.name)) {
    fail(`Duplicate route name: ${route.name}`);
  }

  const segments = parsePath(route.path);
  const params = extractParamNames(segments);

  if (routes.some((entry) => entry.method === route.method.toUpperCase() && entry.path === route.path)) {
    fail(`Duplicate route: ${route.method.toUpperCase()} ${route.path}`);
  }

  routes.push({
    name: route.name,
    method: route.method.toUpperCase(),
    path: route.path,
    params,
    pipelines: route.pipelines.slice(),
    handler: route.handler,
    segments,
  });
}

function matchRoute<Handler>(routes: readonly InternalRoute<Handler>[], method: string, path: string): RouteMatch<Handler> | undefined {
  const normalizedMethod = method.toUpperCase();

  for (const route of routes) {
    if (route.method !== normalizedMethod) {
      continue;
    }

    const params = matchPath(route.segments, path);

    if (params !== undefined) {
      return { route, params };
    }
  }

  return undefined;
}

function buildNamedPath<Handler>(routes: readonly InternalRoute<Handler>[], name: string, params?: Record<string, string>): string {
  const route = routes.find((entry) => entry.name === name);

  if (route === undefined) {
    fail(`Unknown route: ${name}`);
  }

  return buildPath(route.segments, params);
}

function toManifestEntry<Handler>(route: InternalRoute<Handler>): RouteManifestEntry {
  return Object.freeze({
    name: route.name,
    method: route.method,
    path: route.path,
    params: Object.freeze(route.params.slice()),
    pipelines: Object.freeze(route.pipelines.slice()),
  });
}

function toPublicRoute<Handler>(route: InternalRoute<Handler>): Route<Handler> {
  return Object.freeze({
    name: route.name,
    method: route.method,
    path: route.path,
    params: Object.freeze(route.params.slice()),
    pipelines: Object.freeze(route.pipelines.slice()),
    handler: route.handler,
  });
}

function freezeInternalRoute<Handler>(route: InternalRoute<Handler>): InternalRoute<Handler> {
  return Object.freeze({
    ...route,
    params: Object.freeze(route.params.slice()),
    pipelines: Object.freeze(route.pipelines.slice()),
    segments: Object.freeze(route.segments.slice()),
  });
}

function normalizePipes(pipe: RouteScopeOptions["pipe"]): readonly string[] {
  if (pipe === undefined) {
    return [];
  }

  return typeof pipe === "string" ? [pipe] : pipe;
}

function validateMethod(method: RouteMethod): void {
  if (typeof method !== "string" || !/^[A-Z]+$/.test(method.toUpperCase())) {
    fail("Invalid route method");
  }
}

function validateName(name: string, label: string): void {
  if (typeof name !== "string" || name.length === 0) {
    fail(`Expected ${label} to be a non-empty string`);
  }
}

export { RouterError };
