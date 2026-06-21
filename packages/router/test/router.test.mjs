import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { RouterError, defineRoutes } from "../dist/index.js";

function plain(value) {
  if (Array.isArray(value)) {
    return value.map(plain);
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, plain(entry)]));
  }

  return value;
}

describe("@ts-zero/router", () => {
  it("defines explicit named routes and exposes a manifest", () => {
    const handlers = {
      home: () => "home",
      index: () => "index",
      show: () => "show",
      create: () => "create",
    };
    const router = defineRoutes((r) => {
      r.get("home", "/", handlers.home);
      r.scope("/todos", (r) => {
        r.get("todos.index", "/", handlers.index);
        r.post("todos.create", "/", handlers.create);
        r.get("todos.show", "/:id", handlers.show);
      });
    });

    assert.deepEqual(router.manifest(), [
      { name: "home", method: "GET", path: "/", params: [], pipelines: [] },
      { name: "todos.index", method: "GET", path: "/todos", params: [], pipelines: [] },
      { name: "todos.create", method: "POST", path: "/todos", params: [], pipelines: [] },
      { name: "todos.show", method: "GET", path: "/todos/:id", params: ["id"], pipelines: [] },
    ]);
    assert.equal(router.routes[3].handler, handlers.show);
    assert.equal("segments" in router.routes[3], false);
  });

  it("matches routes and returns null-prototype params", () => {
    const router = defineRoutes((r) => {
      r.get("todos.show", "/todos/:id", "show");
    });
    const match = router.match("GET", "/todos/Ada%20Lovelace");

    assert.equal(match.route.name, "todos.show");
    assert.equal(Object.getPrototypeOf(match.params), null);
    assert.deepEqual(plain(match.params), { id: "Ada Lovelace" });
    assert.equal(router.match("POST", "/todos/Ada%20Lovelace"), undefined);
    assert.equal(router.match("GET", "/missing"), undefined);
  });

  it("builds paths by route name", () => {
    const router = defineRoutes((r) => {
      r.get("todos.show", "/todos/:id", "show");
      r.get("home", "/", "home");
    });

    assert.equal(router.path("home"), "/");
    assert.equal(router.path("todos.show", { id: "Ada Lovelace" }), "/todos/Ada%20Lovelace");
    assert.throws(() => router.path("todos.show"), /Missing route param/);
    assert.throws(() => router.path("unknown"), /Unknown route/);
  });

  it("supports pipelines on scoped routes", () => {
    const router = defineRoutes((r) => {
      r.pipeline("browser", []);
      r.pipeline("auth", []);
      r.scope("/", { pipe: "browser" }, (r) => {
        r.get("home", "/", "home");
        r.scope("/admin", { pipe: ["auth"] }, (r) => {
          r.get("admin.dashboard", "/", "dashboard");
        });
      });
    });

    assert.deepEqual(router.manifest(), [
      { name: "home", method: "GET", path: "/", params: [], pipelines: ["browser"] },
      { name: "admin.dashboard", method: "GET", path: "/admin", params: [], pipelines: ["browser", "auth"] },
    ]);
  });

  it("rejects invalid and ambiguous route definitions", () => {
    assert.throws(() => defineRoutes((r) => r.get("", "/", "home")), RouterError);
    assert.throws(() => defineRoutes((r) => r.get("home", "bad", "home")), /start with/);
    assert.throws(() => defineRoutes((r) => r.get("bad", "/todos/:bad-name", "bad")), /parameter/);
    assert.throws(() => defineRoutes((r) => r.get("bad", "/todos/:id/:id", "bad")), /Duplicate route param/);
    assert.throws(() => defineRoutes((r) => r.get("bad", "/todos/id:bad", "bad")), /full path segment/);
    assert.throws(
      () =>
        defineRoutes((r) => {
          r.get("home", "/", "home");
          r.post("home", "/", "duplicate");
        }),
      /Duplicate route name/,
    );
    assert.throws(
      () =>
        defineRoutes((r) => {
          r.get("todos.show", "/todos/:id", "show");
          r.get("todos.edit", "/todos/:id", "edit");
        }),
      /Duplicate route/,
    );
    assert.throws(
      () =>
        defineRoutes((r) => {
          r.scope("/", { pipe: "missing" }, (r) => r.get("home", "/", "home"));
        }),
      /Unknown pipeline/,
    );
  });

  it("rejects malformed request paths", () => {
    const router = defineRoutes((r) => {
      r.get("todos.show", "/todos/:id", "show");
    });

    assert.throws(() => router.match("GET", "/todos/%E0%A4%A"), /percent-encoded/);
    assert.throws(() => router.match("GET", "/todos/123?tab=all"), /without query/);
  });

  it("returns immutable public route and manifest snapshots", () => {
    const router = defineRoutes((r) => {
      r.pipeline("browser", []);
      r.scope("/", { pipe: "browser" }, (r) => {
        r.get("home", "/", "home");
      });
    });
    const route = router.routes[0];
    const manifest = router.manifest();

    assert.equal(Object.isFrozen(router.routes), true);
    assert.equal(Object.isFrozen(route), true);
    assert.equal(Object.isFrozen(route.params), true);
    assert.equal(Object.isFrozen(route.pipelines), true);
    assert.equal(Object.isFrozen(manifest[0]), true);
    assert.equal(Object.isFrozen(manifest[0].params), true);
    assert.equal(Object.isFrozen(manifest[0].pipelines), true);
    assert.throws(() => route.pipelines.push("mutated"), TypeError);
    assert.deepEqual(router.manifest()[0].pipelines, ["browser"]);
  });

  it("exposes focused subpaths for tree-shaking", async () => {
    const builderModule = await import("../dist/builder.js");
    const pathModule = await import("../dist/path.js");
    const pathSource = readFileSync(new URL("../dist/path.js", import.meta.url), "utf8");

    assert.equal(typeof builderModule.defineRoutes, "function");
    assert.equal(typeof pathModule.matchPath, "function");
    assert.equal("defineRoutes" in pathModule, false);
    assert.equal(pathSource.includes("function defineRoutes"), false);
  });

  it("resolves public package subpaths", async () => {
    const root = await import("@ts-zero/router");
    const builder = await import("@ts-zero/router/builder");
    const path = await import("@ts-zero/router/path");
    const errors = await import("@ts-zero/router/errors");

    assert.equal(typeof root.defineRoutes, "function");
    assert.equal(typeof builder.defineRoutes, "function");
    assert.equal(typeof path.parsePath, "function");
    assert.equal(typeof errors.RouterError, "function");
  });
});
