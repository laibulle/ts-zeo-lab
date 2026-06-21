import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { serve } from "../dist/index.js";

describe("@ts-zero/node-server", () => {
  it("serves Web Standard fetch handlers over Node HTTP", async () => {
    let listened;
    const handle = serve({
      port: 3129,
      hostname: "127.0.0.1",
      fetch: async (request) => {
        const url = new URL(request.url);
        return new Response(`ok:${request.method}:${url.pathname}`, {
          headers: {
            "content-type": "text/plain; charset=utf-8",
          },
        });
      },
      onListen: (address) => {
        listened = address;
      },
    });

    try {
      const response = await fetch("http://127.0.0.1:3129/hello");

      assert.deepEqual(listened, { port: 3129, hostname: "127.0.0.1" });
      assert.equal(response.status, 200);
      assert.equal(await response.text(), "ok:GET:/hello");
    } finally {
      await handle.close();
    }
  });

  it("passes request bodies and enforces the configured body limit", async () => {
    const handle = serve({
      port: 3130,
      hostname: "127.0.0.1",
      bodyLimit: 4,
      fetch: async (request) => new Response(await request.text()),
    });

    try {
      const accepted = await fetch("http://127.0.0.1:3130/", {
        method: "POST",
        body: "test",
      });
      const rejected = await fetch("http://127.0.0.1:3130/", {
        method: "POST",
        body: "too-large",
      });

      assert.equal(await accepted.text(), "test");
      assert.equal(rejected.status, 413);
      assert.equal(await rejected.text(), "Payload Too Large");
    } finally {
      await handle.close();
    }
  });

  it("uses custom onError responses", async () => {
    const handle = serve({
      port: 3131,
      hostname: "127.0.0.1",
      fetch: () => {
        throw new Error("boom");
      },
      onError: () => new Response("handled", { status: 599 }),
    });

    try {
      const response = await fetch("http://127.0.0.1:3131/");

      assert.equal(response.status, 599);
      assert.equal(await response.text(), "handled");
    } finally {
      await handle.close();
    }
  });

  it("resolves public package subpaths", async () => {
    const root = await import("@ts-zero/node-server");
    const serveModule = await import("@ts-zero/node-server/serve");

    assert.equal(typeof root.serve, "function");
    assert.equal(typeof serveModule.serve, "function");
  });
});
