export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

export type RouteParams = Record<string, string>;

export interface Context<State = unknown> {
  readonly request: Request;
  readonly url: URL;
  readonly params: RouteParams;
  readonly state: State;
}

export type MaybePromise<T> = T | Promise<T>;

export type Handler<State = unknown> = (context: Context<State>) => MaybePromise<Response>;

export type Next = () => Promise<Response>;

export type Middleware<State = unknown> = (context: Context<State>, next: Next) => MaybePromise<Response>;

export interface App<State = unknown> {
  readonly fetch: (request: Request) => Promise<Response>;
  readonly use: (middleware: Middleware<State>) => App<State>;
  readonly route: (method: HttpMethod, path: string, handler: Handler<State>) => App<State>;
  readonly get: (path: string, handler: Handler<State>) => App<State>;
  readonly post: (path: string, handler: Handler<State>) => App<State>;
  readonly put: (path: string, handler: Handler<State>) => App<State>;
  readonly patch: (path: string, handler: Handler<State>) => App<State>;
  readonly delete: (path: string, handler: Handler<State>) => App<State>;
  readonly head: (path: string, handler: Handler<State>) => App<State>;
  readonly options: (path: string, handler: Handler<State>) => App<State>;
}

export interface CreateAppOptions<State = unknown> {
  readonly state?: State | ((request: Request) => MaybePromise<State>);
  readonly onError?: (error: unknown, context: Context<State>) => MaybePromise<Response>;
  readonly notFound?: Handler<State>;
}
