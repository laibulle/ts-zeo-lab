import { httpError } from "./errors.js";
import type { Handler, HttpMethod, RouteParams } from "./types.js";

export interface Route<State> {
  readonly method: HttpMethod;
  readonly path: string;
  readonly segments: readonly RouteSegment[];
  readonly handler: Handler<State>;
}

export type RouteSegment =
  | {
      readonly kind: "literal";
      readonly value: string;
    }
  | {
      readonly kind: "param";
      readonly name: string;
    };

export interface Match<State> {
  readonly route: Route<State>;
  readonly params: RouteParams;
}

export function createRoute<State>(method: HttpMethod, path: string, handler: Handler<State>): Route<State> {
  return {
    method,
    path,
    segments: parsePath(path),
    handler,
  };
}

export function matchRoute<State>(routes: readonly Route<State>[], method: string, pathname: string): Match<State> | undefined {
  const segments = splitPath(pathname);

  for (const route of routes) {
    if (route.method !== method) {
      continue;
    }

    const params = matchSegments(route.segments, segments);

    if (params !== undefined) {
      return { route, params };
    }
  }

  return undefined;
}

export function hasPathMatch<State>(routes: readonly Route<State>[], pathname: string): boolean {
  const segments = splitPath(pathname);

  for (const route of routes) {
    if (matchSegments(route.segments, segments) !== undefined) {
      return true;
    }
  }

  return false;
}

function parsePath(path: string): readonly RouteSegment[] {
  if (typeof path !== "string" || path.length === 0 || path.charCodeAt(0) !== 0x2f) {
    throw httpError(400, "Route path must start with /");
  }

  return splitPath(path).map((segment) => {
    if (segment.charCodeAt(0) === 0x3a) {
      const name = segment.slice(1);

      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
        throw httpError(400, "Invalid route parameter name");
      }

      return {
        kind: "param",
        name,
      };
    }

    if (segment.includes(":")) {
      throw httpError(400, "Route parameters must occupy a full path segment");
    }

    return {
      kind: "literal",
      value: segment,
    };
  });
}

function splitPath(pathname: string): string[] {
  if (pathname === "/") {
    return [];
  }

  const trimmed = pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  return trimmed.split("/").slice(1).map(decodePathSegment);
}

function decodePathSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    throw httpError(400, "Invalid percent-encoded path segment");
  }
}

function matchSegments(routeSegments: readonly RouteSegment[], pathSegments: readonly string[]): RouteParams | undefined {
  if (routeSegments.length !== pathSegments.length) {
    return undefined;
  }

  const params: RouteParams = Object.create(null) as RouteParams;

  for (let index = 0; index < routeSegments.length; index += 1) {
    const routeSegment = routeSegments[index] as RouteSegment;
    const pathSegment = pathSegments[index] as string;

    if (routeSegment.kind === "literal") {
      if (routeSegment.value !== pathSegment) {
        return undefined;
      }

      continue;
    }

    params[routeSegment.name] = pathSegment;
  }

  return params;
}
