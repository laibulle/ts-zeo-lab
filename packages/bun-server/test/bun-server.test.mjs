import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BunServerError, serve } from "../dist/index.js";

describe("@ts-zero/bun-server", () => {
  it("delegates to Bun.serve when available", async () => {
    const previous = globalThis.Bun;
    let received;
    globalThis.Bun = {
      serve(options) {
        received = options;
        return {
          stop() {
            received.stopped = true;
          },
        };
      },
    };

    try {
      let listened;
      const handle = serve({
        port: 3140,
        hostname: "127.0.0.1",
        development: true,
        fetch: () => new Response("ok"),
        onListen: (address) => {
          listened = address;
        },
      });

      assert.equal(received.port, 3140);
      assert.equal(received.hostname, "127.0.0.1");
      assert.equal(received.development, true);
      assert.equal(await (await received.fetch(new Request("http://localhost/"))).text(), "ok");
      assert.deepEqual(listened, { port: 3140, hostname: "127.0.0.1" });
      handle.stop();
      assert.equal(received.stopped, true);
    } finally {
      if (previous === undefined) {
        delete globalThis.Bun;
      } else {
        globalThis.Bun = previous;
      }
    }
  });

  it("fails closed outside Bun", () => {
    const previous = globalThis.Bun;
    delete globalThis.Bun;

    try {
      assert.throws(() => serve({ fetch: () => new Response("ok") }), BunServerError);
    } finally {
      if (previous !== undefined) {
        globalThis.Bun = previous;
      }
    }
  });

  it("resolves public package subpaths", async () => {
    const root = await import("@ts-zero/bun-server");
    const serveModule = await import("@ts-zero/bun-server/serve");

    assert.equal(typeof root.serve, "function");
    assert.equal(typeof serveModule.serve, "function");
  });
});
