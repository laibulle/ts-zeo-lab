import { fail } from "./errors.js";
import type { RouteParams } from "./types.js";

export type PathSegment =
  | {
      readonly kind: "literal";
      readonly value: string;
    }
  | {
      readonly kind: "param";
      readonly name: string;
    };

export function joinPaths(prefix: string, path: string): string {
  assertPath(prefix, "scope path");
  assertPath(path, "route path");

  if (prefix === "/") {
    return normalizePath(path);
  }

  if (path === "/") {
    return normalizePath(prefix);
  }

  return normalizePath(`${prefix}/${path}`);
}

export function parsePath(path: string): readonly PathSegment[] {
  assertPath(path, "route path");

  return splitPath(path).map((segment) => {
    if (segment.charCodeAt(0) === 0x3a) {
      const name = segment.slice(1);

      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
        fail("Invalid route parameter name");
      }

      return {
        kind: "param",
        name,
      };
    }

    if (segment.includes(":")) {
      fail("Route parameters must occupy a full path segment");
    }

    return {
      kind: "literal",
      value: segment,
    };
  });
}

export function extractParamNames(segments: readonly PathSegment[]): readonly string[] {
  const names: string[] = [];
  const seen = new Set<string>();

  for (const segment of segments) {
    if (segment.kind === "param") {
      if (seen.has(segment.name)) {
        fail(`Duplicate route param: ${segment.name}`);
      }

      seen.add(segment.name);
      names.push(segment.name);
    }
  }

  return names;
}

export function matchPath(segments: readonly PathSegment[], path: string): RouteParams | undefined {
  if (path.includes("?") || path.includes("#")) {
    fail("Expected path without query string or fragment");
  }

  const pathSegments = splitPath(path);

  if (segments.length !== pathSegments.length) {
    return undefined;
  }

  const params = Object.create(null) as RouteParams;

  for (let index = 0; index < segments.length; index += 1) {
    const routeSegment = segments[index] as PathSegment;
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

export function buildPath(segments: readonly PathSegment[], params: RouteParams = Object.create(null) as RouteParams): string {
  if (segments.length === 0) {
    return "/";
  }

  let path = "";

  for (const segment of segments) {
    path += "/";

    if (segment.kind === "literal") {
      path += encodeURIComponent(segment.value);
      continue;
    }

    const value = params[segment.name];

    if (value === undefined) {
      fail(`Missing route param: ${segment.name}`);
    }

    path += encodeURIComponent(value);
  }

  return path;
}

function assertPath(path: string, label: string): void {
  if (typeof path !== "string" || path.length === 0 || path.charCodeAt(0) !== 0x2f) {
    fail(`Expected ${label} to start with /`);
  }
}

function normalizePath(path: string): string {
  const normalized = path.replace(/\/+/g, "/");

  if (normalized.length > 1 && normalized.endsWith("/")) {
    return normalized.slice(0, -1);
  }

  return normalized;
}

function splitPath(path: string): string[] {
  assertPath(path, "path");

  const normalized = normalizePath(path);

  if (normalized === "/") {
    return [];
  }

  return normalized.split("/").slice(1).map(decodePathSegment);
}

function decodePathSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    fail("Invalid percent-encoded path segment");
  }
}
