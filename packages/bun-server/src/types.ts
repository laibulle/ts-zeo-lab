export type FetchHandler = (request: Request) => Response | Promise<Response>;

export interface ServeOptions {
  readonly fetch: FetchHandler;
  readonly port?: number;
  readonly hostname?: string;
  readonly development?: boolean;
  readonly onListen?: (address: ServeAddress) => void;
  readonly onError?: (error: unknown) => Response | Promise<Response>;
}

export interface ServeAddress {
  readonly port: number;
  readonly hostname: string;
}

export interface ServerHandle {
  readonly stop: () => void;
}
