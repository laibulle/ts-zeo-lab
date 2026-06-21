export type FetchHandler = (request: Request) => Response | Promise<Response>;

export interface ServeOptions {
  readonly fetch: FetchHandler;
  readonly port?: number;
  readonly hostname?: string;
  readonly bodyLimit?: number;
  readonly onListen?: (address: ServeAddress) => void;
  readonly onError?: (error: unknown) => Response | Promise<Response>;
}

export interface ServeAddress {
  readonly port: number;
  readonly hostname: string;
}

export interface ServerHandle {
  readonly close: () => Promise<void>;
}
