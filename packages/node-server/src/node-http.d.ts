declare module "node:http" {
  export interface IncomingMessage {
    readonly headers: Record<string, string | string[] | undefined>;
    readonly method?: string;
    readonly url?: string;
    [Symbol.asyncIterator](): AsyncIterableIterator<unknown>;
  }

  export interface ServerResponse {
    statusCode: number;
    statusMessage: string;
    setHeader(name: string, value: string): void;
    writeHead(statusCode: number, headers?: Record<string, string>): void;
    write(chunk: Uint8Array): boolean;
    once(event: "drain", listener: () => void): void;
    end(chunk?: string | Uint8Array): void;
  }

  export interface Server {
    listen(port: number, hostname: string | undefined, callback: () => void): void;
    close(callback?: (error?: Error) => void): void;
  }

  export function createServer(
    handler: (request: IncomingMessage, response: ServerResponse) => void | Promise<void>,
  ): Server;
}
