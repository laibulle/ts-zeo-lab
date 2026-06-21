import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  assertSerializable,
  createMemoryHostChannel,
  createResourceHandle,
  createRuntime,
  isResourceHandle,
  RuntimeError,
} from "../dist/index.js";
import { createMemoryHostChannel as createMemoryHostChannelFromSubpath } from "../dist/channel.js";
import { createResourceHandle as createResourceHandleFromSubpath } from "../dist/handles.js";
import { createRuntime as createRuntimeFromSubpath } from "../dist/runtime.js";

test("sends capability requests over a host channel and resolves responses", async () => {
  const outbound = [];
  const channel = createMemoryHostChannel({
    onRuntimeMessage: (message) => {
      outbound.push(message);
    },
  });
  const runtime = createRuntime({
    channel,
    createId: () => "request-1",
  });
  const result = runtime.request("storage", "set", {
    key: "session",
    value: "token",
  });

  assert.deepEqual(outbound, [
    {
      kind: "request",
      id: "request-1",
      capability: "storage",
      operation: "set",
      payload: {
        key: "session",
        value: "token",
      },
    },
  ]);

  channel.receive({
    kind: "response",
    id: "request-1",
    ok: true,
    value: { saved: true },
  });

  assert.deepEqual(await result, { saved: true });
});

test("emits runtime events and receives host events", () => {
  const outbound = [];
  const channel = createMemoryHostChannel({
    onRuntimeMessage: (message) => outbound.push(message),
  });
  const runtime = createRuntime({ channel });
  const inbound = [];

  const unsubscribe = runtime.subscribe((message) => inbound.push(message));

  runtime.emit("todo.create", { title: "Ship" });
  channel.receive({ kind: "event", name: "route.changed", payload: { path: "/todos" } });
  unsubscribe();
  channel.receive({ kind: "event", name: "ignored" });

  assert.deepEqual(outbound, [
    {
      kind: "event",
      name: "todo.create",
      payload: { title: "Ship" },
    },
  ]);
  assert.deepEqual(inbound, [
    {
      kind: "event",
      name: "route.changed",
      payload: { path: "/todos" },
    },
  ]);
});

test("rejects failed responses and destroys pending work", async () => {
  const channel = createMemoryHostChannel();
  const runtime = createRuntime({
    channel,
    createId: () => "request-1",
  });
  const failed = runtime.request("camera", "capturePhoto");

  channel.receive({
    kind: "response",
    id: "request-1",
    ok: false,
    error: "permission denied",
  });

  await assert.rejects(failed, RuntimeError);

  const pending = createRuntime({
    channel: createMemoryHostChannel(),
    createId: () => "request-2",
  });
  const request = pending.request("location", "current");

  pending.destroy("closed by host");

  await assert.rejects(request, /closed by host/);
  assert.throws(() => pending.emit("after.destroy"), RuntimeError);
});

test("validates serializable messages and resource handles", () => {
  const handle = createResourceHandle("camera.frame", "frame-1", {
    width: 1920,
    height: 1080,
  });

  assert.equal(isResourceHandle(handle), true);
  assert.equal(Object.isFrozen(handle), true);
  assert.doesNotThrow(() => assertSerializable({ frame: handle }));
  assert.throws(() => createResourceHandle("", "frame-1"), RuntimeError);
  assert.throws(() => createResourceHandle("camera.frame", ""), RuntimeError);
  assert.throws(() => assertSerializable({ nope: () => undefined }), RuntimeError);
  assert.throws(() => assertSerializable({ value: Number.NaN }), RuntimeError);
  assert.throws(() => assertSerializable(JSON.parse("{\"__proto__\":null}")), RuntimeError);

  const cyclic = {};
  cyclic.self = cyclic;

  assert.throws(() => assertSerializable(cyclic), RuntimeError);
});

test("fails closed for malformed runtime input", () => {
  const channel = createMemoryHostChannel();
  const runtime = createRuntime({ channel });

  assert.throws(() => createRuntime(null), RuntimeError);
  assert.throws(() => createRuntime({ channel: {} }), RuntimeError);
  assert.throws(() => runtime.request("", "op"), RuntimeError);
  assert.throws(() => runtime.request("capability", ""), RuntimeError);
  assert.throws(() => runtime.emit(""), RuntimeError);
  assert.throws(() => runtime.receive({ kind: "unknown", name: "nope" }), RuntimeError);
  assert.throws(() => runtime.receive({ kind: "event", name: "" }), RuntimeError);
  assert.throws(() => runtime.receive({ kind: "response", id: "x", ok: "yes" }), RuntimeError);
  assert.throws(() => runtime.receive({ kind: "response", id: "missing", ok: true }), RuntimeError);
});

test("cleans pending requests when the host channel send fails", () => {
  const runtime = createRuntime({
    channel: {
      send() {
        throw new RuntimeError("host channel closed");
      },
      subscribe() {
        return () => undefined;
      },
    },
    createId: () => "request-1",
  });

  assert.throws(() => runtime.request("storage", "get"), /host channel closed/);
  assert.throws(() => runtime.receive({ kind: "response", id: "request-1", ok: true }), /Unknown response id/);
});

test("resolves focused public package subpaths", async () => {
  const root = await import("@ts-zero/runtime");
  const channel = await import("@ts-zero/runtime/channel");
  const errors = await import("@ts-zero/runtime/errors");
  const handles = await import("@ts-zero/runtime/handles");
  const runtime = await import("@ts-zero/runtime/runtime");
  const serializable = await import("@ts-zero/runtime/serializable");
  const types = await import("@ts-zero/runtime/types");

  assert.equal(root.createRuntime, createRuntime);
  assert.equal(channel.createMemoryHostChannel, createMemoryHostChannelFromSubpath);
  assert.equal(errors.RuntimeError, RuntimeError);
  assert.equal(handles.createResourceHandle, createResourceHandleFromSubpath);
  assert.equal(runtime.createRuntime, createRuntimeFromSubpath);
  assert.equal(typeof serializable.assertSerializable, "function");
  assert.deepEqual(Object.keys(types), []);
});

test("public barrel remains a re-export-only module for tree-checking", () => {
  const source = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");

  assert.match(source, /^export /m);
  assert.doesNotMatch(source, /function\s+/);
  assert.doesNotMatch(source, /const\s+/);
  assert.doesNotMatch(source, /let\s+/);
  assert.doesNotMatch(source, /class\s+/);
});
