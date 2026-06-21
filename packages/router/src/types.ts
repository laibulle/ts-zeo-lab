export type RouteMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS" | (string & {});

export type RouteParams = Record<string, string>;

export type RouteHandler = unknown;

export interface RouteManifestEntry {
  readonly name: string;
  readonly method: RouteMethod;
  readonly path: string;
  readonly params: readonly string[];
  readonly pipelines: readonly string[];
}

export interface Route<Handler = RouteHandler> extends RouteManifestEntry {
  readonly handler: Handler;
}

export interface RouteMatch<Handler = RouteHandler> {
  readonly route: Route<Handler>;
  readonly params: RouteParams;
}

export interface Router<Handler = RouteHandler> {
  readonly routes: readonly Route<Handler>[];
  readonly manifest: () => readonly RouteManifestEntry[];
  readonly match: (method: string, path: string) => RouteMatch<Handler> | undefined;
  readonly path: (name: string, params?: RouteParams) => string;
}

export interface RouteScopeOptions {
  readonly pipe?: string | readonly string[];
}

export interface ScopeBuilder<Handler = RouteHandler> {
  (path: string, define: (routes: RoutesBuilder<Handler>) => void): RoutesBuilder<Handler>;
  (path: string, options: RouteScopeOptions, define: (routes: RoutesBuilder<Handler>) => void): RoutesBuilder<Handler>;
}

export interface RoutesBuilder<Handler = RouteHandler> {
  readonly pipeline: (name: string, pipeline: readonly unknown[]) => RoutesBuilder<Handler>;
  readonly scope: ScopeBuilder<Handler>;
  readonly route: (method: RouteMethod, name: string, path: string, handler: Handler) => RoutesBuilder<Handler>;
  readonly get: (name: string, path: string, handler: Handler) => RoutesBuilder<Handler>;
  readonly post: (name: string, path: string, handler: Handler) => RoutesBuilder<Handler>;
  readonly put: (name: string, path: string, handler: Handler) => RoutesBuilder<Handler>;
  readonly patch: (name: string, path: string, handler: Handler) => RoutesBuilder<Handler>;
  readonly delete: (name: string, path: string, handler: Handler) => RoutesBuilder<Handler>;
  readonly head: (name: string, path: string, handler: Handler) => RoutesBuilder<Handler>;
  readonly options: (name: string, path: string, handler: Handler) => RoutesBuilder<Handler>;
}
