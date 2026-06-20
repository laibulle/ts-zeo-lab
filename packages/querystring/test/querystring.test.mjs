import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { QuerystringError, parseQuery, stringifyQuery } from "../dist/index.js";

function plain(value) {
  if (Array.isArray(value)) {
    return value.map(plain);
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, plain(entry)]));
  }

  return value;
}

describe("@ts-zero/querystring", () => {
  it("parses empty and leading-question-mark query strings", () => {
    assert.deepEqual(plain(parseQuery("")), {});
    assert.deepEqual(plain(parseQuery("?a=1&b=2")), { a: "1", b: "2" });
  });

  it("parses scalar values, duplicate keys, arrays, and nested objects", () => {
    assert.deepEqual(plain(parseQuery("a=1&b=two")), { a: "1", b: "two" });
    assert.deepEqual(plain(parseQuery("a=1&a=2")), { a: ["1", "2"] });
    assert.deepEqual(plain(parseQuery("tags[]=ts&tags[]=zero")), { tags: ["ts", "zero"] });
    assert.deepEqual(plain(parseQuery("user[name]=Ada&user[role]=admin")), {
      user: { name: "Ada", role: "admin" },
    });
  });

  it("decodes percent-encoded values and plus-as-space by default", () => {
    assert.deepEqual(plain(parseQuery("q=hello+world&sym=%E2%9C%93")), {
      q: "hello world",
      sym: "\u2713",
    });
    assert.deepEqual(plain(parseQuery("q=hello+world", { plusAsSpace: false })), {
      q: "hello+world",
    });
  });

  it("stringifies scalars, arrays, and nested objects", () => {
    assert.equal(stringifyQuery({ a: "1", b: 2, c: true, d: null }), "a=1&b=2&c=true&d=");
    assert.equal(stringifyQuery({ tags: ["ts", "zero"] }), "tags%5B%5D=ts&tags%5B%5D=zero");
    assert.equal(stringifyQuery({ user: { name: "Ada", role: "admin" } }), "user%5Bname%5D=Ada&user%5Brole%5D=admin");
    assert.equal(stringifyQuery({ q: "hello world", sym: "\u2713" }), "q=hello%20world&sym=%E2%9C%93");
  });

  it("can stringify without encoding", () => {
    assert.equal(stringifyQuery({ tags: ["ts", "zero"] }, { encode: false }), "tags[]=ts&tags[]=zero");
  });

  it("round-trips the supported strict subset", () => {
    const source = {
      a: "1",
      tags: ["ts", "zero"],
      user: { name: "Ada", role: "admin" },
    };

    assert.deepEqual(plain(parseQuery(stringifyQuery(source))), source);
  });

  it("returns null-prototype objects and skips prototype pollution keys", () => {
    const result = parseQuery("__proto__[polluted]=yes&constructor[prototype][polluted]=yes&safe=value");
    const source = Object.create(null);
    source.__proto__ = "bad";
    source.safe = "value";

    assert.equal(Object.getPrototypeOf(result), null);
    assert.equal(Object.prototype.polluted, undefined);
    assert.deepEqual(plain(result), { safe: "value" });
    assert.equal(stringifyQuery(source), "safe=value");
  });

  it("rejects malformed, ambiguous, and unsafe inputs", () => {
    assert.throws(() => parseQuery("a[b=1"), QuerystringError);
    assert.throws(() => parseQuery("[]=1"), QuerystringError);
    assert.throws(() => parseQuery("a=1&a[b]=2"), QuerystringError);
    assert.throws(() => parseQuery("a[b]=1&a=2"), QuerystringError);
    assert.throws(() => parseQuery("bad=%E0%A4%A"), QuerystringError);
    assert.throws(() => parseQuery("a[b][c]=1", { depth: 1 }), /depth limit/);
    assert.throws(() => parseQuery("a=1&b=2", { parameterLimit: 1 }), /parameter limit/);
    assert.throws(() => stringifyQuery({ a: Number.POSITIVE_INFINITY }), /non-finite/);
    assert.throws(() => stringifyQuery({ a: [{ b: "c" }] }), /Arrays of objects/);
  });

  it("rejects stringifier structures that would be unsafe or ambiguous", () => {
    const circular = { a: "1" };
    circular.self = circular;

    assert.throws(() => stringifyQuery({ "a[b]": "c" }), /must not contain brackets/);
    assert.throws(() => stringifyQuery({ a: { b: { c: "1" } } }, { depth: 1 }), /depth limit/);
    assert.throws(() => stringifyQuery(circular), /circular/);
    assert.throws(() => stringifyQuery({ a: "1" }, { delimiter: "" }), /delimiter/);
    assert.throws(() => stringifyQuery({ a: "1" }, { encode: "no" }), /encode/);
  });

  it("validates parser option types at runtime", () => {
    assert.throws(() => parseQuery("a=1", { delimiter: "" }), /delimiter/);
    assert.throws(() => parseQuery("a=1", { delimiter: 1 }), /delimiter/);
    assert.throws(() => parseQuery("a=1", { plusAsSpace: "yes" }), /plusAsSpace/);
  });

  it("supports custom delimiters", () => {
    assert.deepEqual(plain(parseQuery("a=1;b=2", { delimiter: ";" })), { a: "1", b: "2" });
    assert.equal(stringifyQuery({ a: "1", b: "2" }, { delimiter: ";" }), "a=1;b=2");
  });

  it("exposes focused subpaths for tree-shaking", async () => {
    const parseModule = await import("../dist/parse.js");
    const stringifyModule = await import("../dist/stringify.js");
    const parseSource = readFileSync(new URL("../dist/parse.js", import.meta.url), "utf8");
    const stringifySource = readFileSync(new URL("../dist/stringify.js", import.meta.url), "utf8");

    assert.equal(typeof parseModule.parseQuery, "function");
    assert.equal(typeof stringifyModule.stringifyQuery, "function");
    assert.equal("stringifyQuery" in parseModule, false);
    assert.equal("parseQuery" in stringifyModule, false);
    assert.equal(parseSource.includes("function stringifyQuery"), false);
    assert.equal(stringifySource.includes("function parseQuery"), false);
  });

  it("resolves public package subpaths", async () => {
    const root = await import("@ts-zero/querystring");
    const parseModule = await import("@ts-zero/querystring/parse");
    const stringifyModule = await import("@ts-zero/querystring/stringify");

    assert.equal(root.parseQuery("a=1").a, "1");
    assert.equal(parseModule.parseQuery("a=1").a, "1");
    assert.equal(stringifyModule.stringifyQuery({ a: "1" }), "a=1");
  });
});
