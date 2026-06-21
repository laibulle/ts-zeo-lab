import { fail } from "./errors.js";
import type { ServeOptions, ServerHandle } from "./types.js";

const DEFAULT_PORT = 3000;
const DEFAULT_HOSTNAME = "127.0.0.1";

interface BunLike {
  readonly serve: (options: {
    readonly port: number;
    readonly hostname: string;
    readonly development?: boolean;
    readonly fetch: (request: Request) => Response | Promise<Response>;
    readonly error?: (error: unknown) => Response | Promise<Response>;
  }) => {
    readonly stop: () => void;
  };
}

export function serve(options: ServeOptions): ServerHandle {
  validateOptions(options);

  const bun = getBun();
  const port = options.port ?? DEFAULT_PORT;
  const hostname = options.hostname ?? DEFAULT_HOSTNAME;
  const server = bun.serve({
    port,
    hostname,
    development: options.development,
    fetch: options.fetch,
    error: options.onError,
  });

  options.onListen?.({ port, hostname });

  return {
    stop: () => server.stop(),
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

  if (options.development !== undefined && typeof options.development !== "boolean") {
    fail("Expected development to be a boolean");
  }
}

function getBun(): BunLike {
  const bun = (globalThis as { readonly Bun?: BunLike }).Bun;

  if (bun === undefined || typeof bun.serve !== "function") {
    fail("Bun.serve is unavailable");
  }

  return bun;
}
