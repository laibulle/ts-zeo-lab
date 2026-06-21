import { createServer } from "node:http";
import { fail } from "./errors.js";
import type { FetchHandler, ServeAddress, ServeOptions, ServerHandle } from "./types.js";

const DEFAULT_PORT = 3000;
const DEFAULT_HOSTNAME = "127.0.0.1";
const DEFAULT_BODY_LIMIT = 1_048_576;

interface NodeIncoming {
  readonly headers: Record<string, string | string[] | undefined>;
  readonly method?: string;
  readonly url?: string;
  [Symbol.asyncIterator](): AsyncIterableIterator<unknown>;
}

interface NodeOutgoing {
  statusCode: number;
  statusMessage: string;
  setHeader(name: string, value: string): void;
  writeHead(statusCode: number, headers?: Record<string, string>): void;
  write(chunk: Uint8Array): boolean;
  once(event: "drain", listener: () => void): void;
  end(chunk?: string | Uint8Array): void;
}

interface NodeServer {
  listen(port: number, hostname: string | undefined, callback: () => void): void;
  close(callback?: (error?: Error) => void): void;
}

export function serve(options: ServeOptions): ServerHandle {
  validateOptions(options);

  const port = options.port ?? DEFAULT_PORT;
  const hostname = options.hostname ?? DEFAULT_HOSTNAME;
  const bodyLimit = options.bodyLimit ?? DEFAULT_BODY_LIMIT;
  const server = createServer(async (incoming, outgoing) => {
    try {
      const request = await toRequest(incoming as NodeIncoming, { port, bodyLimit });
      const response = await options.fetch(request);
      await writeResponse(outgoing as NodeOutgoing, response);
    } catch (error) {
      await writeResponse(outgoing as NodeOutgoing, await fallbackErrorResponse(error, options.onError));
    }
  }) as NodeServer;

  server.listen(port, hostname, () => {
    options.onListen?.({ port, hostname });
  });

  return {
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => {
          if (error !== undefined) {
            reject(error);
            return;
          }

          resolve();
        });
      }),
  };
}

function validateOptions(options: ServeOptions): void {
  if (typeof options !== "object" || options === null) {
    fail("Expected serve options");
  }

  if (typeof options.fetch !== "function") {
    fail("Expected fetch handler");
  }

  if (options.port !== undefined && (!Number.isSafeInteger(options.port) || options.port < 0 || options.port > 65_535)) {
    fail("Expected port to be an integer between 0 and 65535");
  }

  if (options.hostname !== undefined && (typeof options.hostname !== "string" || options.hostname.length === 0)) {
    fail("Expected hostname to be a non-empty string");
  }

  if (
    options.bodyLimit !== undefined &&
    (!Number.isSafeInteger(options.bodyLimit) || options.bodyLimit < 0)
  ) {
    fail("Expected bodyLimit to be a non-negative safe integer");
  }
}

async function toRequest(incoming: NodeIncoming, options: { readonly port: number; readonly bodyLimit: number }): Promise<Request> {
  const method = incoming.method ?? "GET";
  const host = incoming.headers.host ?? `localhost:${options.port}`;
  const url = new URL(incoming.url ?? "/", `http://${Array.isArray(host) ? host[0] : host}`);
  const headers = toHeaders(incoming.headers);

  if (method === "GET" || method === "HEAD") {
    return new Request(url, { method, headers });
  }

  const body = await readBody(incoming, options.bodyLimit);

  return new Request(url, {
    method,
    headers,
    body: toArrayBuffer(body),
  });
}

function toHeaders(headers: Record<string, string | string[] | undefined>): Headers {
  const output = new Headers();

  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        output.append(name, entry);
      }
      continue;
    }

    output.set(name, value);
  }

  return output;
}

async function readBody(incoming: NodeIncoming, limit: number): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  let size = 0;

  for await (const chunk of incoming) {
    const bytes = chunkToBytes(chunk);
    size += bytes.length;

    if (size > limit) {
      throw new Response("Payload Too Large", { status: 413 });
    }

    chunks.push(bytes);
  }

  const body = new Uint8Array(size);
  let offset = 0;

  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.length;
  }

  return body;
}

function chunkToBytes(chunk: unknown): Uint8Array {
  if (chunk instanceof Uint8Array) {
    return chunk;
  }

  return new TextEncoder().encode(String(chunk));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.length);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

async function writeResponse(outgoing: NodeOutgoing, response: Response): Promise<void> {
  outgoing.statusCode = response.status;
  outgoing.statusMessage = response.statusText;

  response.headers.forEach((value, name) => {
    outgoing.setHeader(name, value);
  });

  if (response.body === null) {
    outgoing.end();
    return;
  }

  const reader = response.body.getReader();

  try {
    while (true) {
      const read = await reader.read();

      if (read.done) {
        outgoing.end();
        return;
      }

      if (!outgoing.write(read.value)) {
        await new Promise<void>((resolve) => outgoing.once("drain", resolve));
      }
    }
  } finally {
    reader.releaseLock();
  }
}

async function fallbackErrorResponse(
  error: unknown,
  onError: ServeOptions["onError"],
): Promise<Response> {
  if (error instanceof Response) {
    return error;
  }

  if (onError !== undefined) {
    return onError(error);
  }

  return new Response("Internal Server Error", {
    status: 500,
    headers: {
      "content-type": "text/plain; charset=utf-8",
    },
  });
}
