import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { MultipartError, createBoundary, encodeMultipart, field, file } from "../dist/index.js";

const decoder = new TextDecoder();

function text(bytes) {
  return decoder.decode(bytes);
}

describe("@ts-zero/multipart", () => {
  it("encodes fields and files with a deterministic boundary", () => {
    const encoded = encodeMultipart(
      [
        field("name", "Ada"),
        file("avatar", "ada.txt", new Uint8Array([0x68, 0x69]), "text/plain"),
      ],
      { boundary: "ts-zero-test-boundary" },
    );

    assert.equal(encoded.boundary, "ts-zero-test-boundary");
    assert.equal(encoded.contentType, "multipart/form-data; boundary=ts-zero-test-boundary");
    assert.equal(
      text(encoded.bytes),
      [
        "--ts-zero-test-boundary",
        'Content-Disposition: form-data; name="name"',
        "",
        "Ada",
        "--ts-zero-test-boundary",
        'Content-Disposition: form-data; name="avatar"; filename="ada.txt"',
        "Content-Type: text/plain",
        "",
        "hi",
        "--ts-zero-test-boundary--",
        "",
      ].join("\r\n"),
    );
  });

  it("uses application/octet-stream for files by default", () => {
    const encoded = encodeMultipart([file("upload", "data.bin", [0, 1, 2])], {
      boundary: "ts-zero-test-boundary",
    });

    assert.equal(text(encoded.bytes).includes("Content-Type: application/octet-stream"), true);
  });

  it("creates secure boundaries and supports deterministic random injection", () => {
    const boundary = createBoundary((target) => {
      target.fill(0xab);
      return target;
    });

    assert.equal(boundary, "ts-zero-" + "ab".repeat(24));
  });

  it("rejects unsafe header parameters and malformed content types", () => {
    assert.throws(() => encodeMultipart([field("bad\r\nname", "x")], { boundary: "safe" }), MultipartError);
    assert.throws(() => encodeMultipart([field('bad"name', "x")], { boundary: "safe" }), MultipartError);
    assert.throws(() => encodeMultipart([field("bad\\name", "x")], { boundary: "safe" }), MultipartError);
    assert.throws(() => encodeMultipart([field("bad\u0000name", "x")], { boundary: "safe" }), MultipartError);
    assert.throws(() => encodeMultipart([file("file", "bad\r\n.txt", new Uint8Array())], { boundary: "safe" }), MultipartError);
    assert.throws(() => encodeMultipart([file("file", "a.txt", new Uint8Array(), "text/plain\r\nx: y")], { boundary: "safe" }), MultipartError);
  });

  it("rejects invalid boundaries and byte values", () => {
    assert.throws(() => encodeMultipart([], { boundary: "" }), /boundary/);
    assert.throws(() => encodeMultipart([], { boundary: "x".repeat(71) }), /boundary/);
    assert.throws(() => encodeMultipart([file("file", "a.bin", [256])], { boundary: "safe" }), /byte values/);
  });

  it("rejects boundaries that appear inside part bodies", () => {
    assert.throws(() => encodeMultipart([field("text", "hello --safe")], { boundary: "safe" }), /boundary/);
    assert.throws(() => encodeMultipart([file("file", "a.txt", new TextEncoder().encode("hello --safe"))], { boundary: "safe" }), /boundary/);
  });

  it("exposes focused subpaths for tree-shaking", async () => {
    const encodeModule = await import("../dist/encode.js");
    const partsModule = await import("../dist/parts.js");
    const boundaryModule = await import("../dist/boundary.js");
    const partsSource = readFileSync(new URL("../dist/parts.js", import.meta.url), "utf8");

    assert.equal(typeof encodeModule.encodeMultipart, "function");
    assert.equal(typeof partsModule.field, "function");
    assert.equal(typeof partsModule.file, "function");
    assert.equal(typeof boundaryModule.createBoundary, "function");
    assert.equal("encodeMultipart" in partsModule, false);
    assert.equal(partsSource.includes("getRandomValues"), false);
  });

  it("resolves public package subpaths", async () => {
    const root = await import("@ts-zero/multipart");
    const encodeModule = await import("@ts-zero/multipart/encode");
    const partsModule = await import("@ts-zero/multipart/parts");
    const boundaryModule = await import("@ts-zero/multipart/boundary");

    assert.equal(typeof root.encodeMultipart, "function");
    assert.equal(typeof encodeModule.encodeMultipart, "function");
    assert.equal(partsModule.field("name", "Ada").value, "Ada");
    assert.equal(typeof boundaryModule.createBoundary, "function");
  });

  it("fails closed when secure crypto is unavailable", () => {
    const script = `
      Object.defineProperty(globalThis, "crypto", {
        configurable: true,
        value: {},
      });
      import("./packages/multipart/dist/index.js")
        .then(({ encodeMultipart, field }) => {
          try {
            encodeMultipart([field("name", "Ada")]);
            process.exit(1);
          } catch (error) {
            if (String(error.message).includes("Secure random values are unavailable")) {
              process.exit(0);
            }
            process.exit(2);
          }
        });
    `;
    const result = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
      cwd: new URL("../../..", import.meta.url),
      encoding: "utf8",
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
  });
});
