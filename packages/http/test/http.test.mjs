import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { HttpError, createApp, html, httpError, json, noContent, redirect, text } from "../dist/index.js";

function request(path, init) {
  return new Request(`https://example.com${path}`, init);
}

describe("@ts-zero/http", () => {
  it("routes Web Standard requests and returns Web Standard responses", async () => {
    const app = createApp();
    app.get("/", () => text("hello"));

    const response = await app.fetch(request("/"));

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "text/plain; charset=utf-8");
    assert.equal(await response.text(), "hello");
  });

  it("extracts decoded route params and exposes URL state", async () => {
    const app = createApp({ state: { env: "test" } });
    app.get("/users/:id", ({ params, url, state }) =>
      json({
        id: params.id,
        q: url.searchParams.get("q"),
        env: state.env,
      }),
    );

    const response = await app.fetch(request("/users/Ada%20Lovelace?q=ok"));

    assert.deepEqual(await response.json(), {
      id: "Ada Lovelace",
      q: "ok",
      env: "test",
    });
  });

  it("runs middleware in order", async () => {
    const seen = [];
    const app = createApp();
    app.use(async (_context, next) => {
      seen.push("a:before");
      const response = await next();
      seen.push("a:after");
      response.headers.set("x-a", "1");
      return response;
    });
    app.use(async (_context, next) => {
      seen.push("b:before");
      const response = await next();
      seen.push("b:after");
      response.headers.set("x-b", "1");
      return response;
    });
    app.get("/", () => text("ok"));

    const response = await app.fetch(request("/"));

    assert.deepEqual(seen, ["a:before", "b:before", "b:after", "a:after"]);
    assert.equal(response.headers.get("x-a"), "1");
    assert.equal(response.headers.get("x-b"), "1");
  });

  it("supports async state factories", async () => {
    const app = createApp({
      state: async (incoming) => ({ method: incoming.method }),
    });
    app.post("/", ({ state }) => text(state.method));

    const response = await app.fetch(request("/", { method: "POST" }));

    assert.equal(await response.text(), "POST");
  });

  it("returns 404 and 405 fallbacks", async () => {
    const app = createApp();
    app.get("/users", () => text("users"));

    const missing = await app.fetch(request("/missing"));
    const wrongMethod = await app.fetch(request("/users", { method: "POST" }));

    assert.equal(missing.status, 404);
    assert.equal(await missing.text(), "Not Found");
    assert.equal(wrongMethod.status, 405);
    assert.equal(await wrongMethod.text(), "Method Not Allowed");
  });

  it("supports custom notFound and onError handlers", async () => {
    const app = createApp({
      notFound: () => json({ error: "missing" }, { status: 404 }),
      onError: (error) => {
        if (error instanceof HttpError) {
          return json({ error: error.message }, { status: error.status });
        }

        return json({ error: "internal" }, { status: 500 });
      },
    });
    app.get("/forbidden", () => {
      throw httpError(403, "nope");
    });
    app.get("/boom", () => {
      throw new Error("boom");
    });

    assert.deepEqual(await (await app.fetch(request("/missing"))).json(), { error: "missing" });
    assert.deepEqual(await (await app.fetch(request("/forbidden"))).json(), { error: "nope" });
    assert.deepEqual(await (await app.fetch(request("/boom"))).json(), { error: "internal" });
  });

  it("strips response bodies for HEAD requests", async () => {
    const app = createApp();
    app.head("/health", () => text("ok", { headers: { "x-health": "1" } }));

    const response = await app.fetch(request("/health", { method: "HEAD" }));

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-health"), "1");
    assert.equal(await response.text(), "");
  });

  it("rejects invalid route paths and malformed request paths", async () => {
    assert.throws(() => createApp().get("users", () => text("bad")), /Route path/);
    assert.throws(() => createApp().get("/users/:bad-name", () => text("bad")), /parameter/);

    const app = createApp();
    app.get("/users/:id", () => text("ok"));

    const response = await app.fetch(request("/users/%E0%A4%A"));

    assert.equal(response.status, 400);
    assert.equal(await response.text(), "Invalid percent-encoded path segment");
  });

  it("provides response helpers", async () => {
    assert.equal(await html("<h1>Hi</h1>").text(), "<h1>Hi</h1>");
    assert.equal(html("").headers.get("content-type"), "text/html; charset=utf-8");
    assert.deepEqual(await json({ ok: true }).json(), { ok: true });
    assert.equal(redirect("/next", 303).headers.get("location"), "/next");
    assert.equal(noContent().status, 204);
    assert.throws(() => redirect("/bad", 200), /Redirect status/);
  });

  it("exposes focused subpaths for tree-shaking", async () => {
    const appModule = await import("../dist/app.js");
    const responsesModule = await import("../dist/responses.js");
    const appSource = readFileSync(new URL("../dist/app.js", import.meta.url), "utf8");
    const responsesSource = readFileSync(new URL("../dist/responses.js", import.meta.url), "utf8");

    assert.equal(typeof appModule.createApp, "function");
    assert.equal(typeof responsesModule.json, "function");
    assert.equal("json" in appModule, false);
    assert.equal("createApp" in responsesModule, false);
    assert.equal(appSource.includes("function json"), false);
    assert.equal(responsesSource.includes("function createApp"), false);
  });

  it("resolves public package subpaths", async () => {
    const root = await import("@ts-zero/http");
    const appModule = await import("@ts-zero/http/app");
    const responsesModule = await import("@ts-zero/http/responses");
    const errorsModule = await import("@ts-zero/http/errors");

    assert.equal(typeof root.createApp, "function");
    assert.equal(typeof appModule.createApp, "function");
    assert.equal(typeof responsesModule.json, "function");
    assert.equal(typeof errorsModule.httpError, "function");
  });
});
