import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  assertSerializable,
  createMemoryHostChannel,
  createNativeHandle,
  createNativeRuntime,
  isNativeHandle,
  NativeRuntimeError,
} from "../dist/index.js";
import { createMemoryHostChannel as createMemoryHostChannelFromSubpath } from "../dist/channel.js";
import { createNativeHandle as createNativeHandleFromSubpath } from "../dist/handles.js";
import { createNativeRuntime as createNativeRuntimeFromSubpath } from "../dist/runtime.js";

test("sends capability requests over a host channel and resolves responses", async () => {
  const outbound = [];
  const channel = createMemoryHostChannel({
    onRuntimeMessage: (message) => {
      outbound.push(message);
    },
  });
  const runtime = createNativeRuntime({
    channel,
    createId: () => "request-1",
  });
  const result = runtime.request("secureStorage", "set", {
    key: "session",
    value: "token",
  });

  assert.deepEqual(outbound, [
    {
      kind: "request",
      id: "request-1",
      capability: "secureStorage",
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
  const runtime = createNativeRuntime({ channel });
  const inbound = [];

  const unsubscribe = runtime.subscribe((message) => inbound.push(message));

  runtime.emit("analytics.track", { name: "opened" });
  channel.receive({ kind: "event", name: "deepLink.opened", payload: { path: "/todos" } });
  unsubscribe();
  channel.receive({ kind: "event", name: "ignored" });

  assert.deepEqual(outbound, [
    {
      kind: "event",
      name: "analytics.track",
      payload: { name: "opened" },
    },
  ]);
  assert.deepEqual(inbound, [
    {
      kind: "event",
      name: "deepLink.opened",
      payload: { path: "/todos" },
    },
  ]);
});

test("rejects failed native responses and destroys pending work", async () => {
  const channel = createMemoryHostChannel();
  const runtime = createNativeRuntime({
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

  await assert.rejects(failed, NativeRuntimeError);

  const pending = createNativeRuntime({
    channel: createMemoryHostChannel(),
    createId: () => "request-2",
  });
  const request = pending.request("location", "current");

  pending.destroy("closed by host");

  await assert.rejects(request, /closed by host/);
  assert.throws(() => pending.emit("after.destroy"), NativeRuntimeError);
});

test("validates serializable messages and native resource handles", () => {
  const handle = createNativeHandle("camera.frame", "frame-1", {
    width: 1920,
    height: 1080,
  });

  assert.equal(isNativeHandle(handle), true);
  assert.equal(Object.isFrozen(handle), true);
  assert.doesNotThrow(() => assertSerializable({ frame: handle }));
  assert.throws(() => createNativeHandle("", "frame-1"), NativeRuntimeError);
  assert.throws(() => createNativeHandle("camera.frame", ""), NativeRuntimeError);
  assert.throws(() => assertSerializable({ nope: () => undefined }), NativeRuntimeError);
  assert.throws(() => assertSerializable({ value: Number.NaN }), NativeRuntimeError);
  assert.throws(() => assertSerializable(JSON.parse("{\"__proto__\":null}")), NativeRuntimeError);

  const cyclic = {};
  cyclic.self = cyclic;

  assert.throws(() => assertSerializable(cyclic), NativeRuntimeError);
});

test("fails closed for malformed runtime input", async () => {
  const channel = createMemoryHostChannel();
  const runtime = createNativeRuntime({ channel });

  assert.throws(() => createNativeRuntime(null), NativeRuntimeError);
  assert.throws(() => createNativeRuntime({ channel: {} }), NativeRuntimeError);
  assert.throws(() => runtime.request("", "op"), NativeRuntimeError);
  assert.throws(() => runtime.request("capability", ""), NativeRuntimeError);
  assert.throws(() => runtime.emit(""), NativeRuntimeError);
  assert.throws(() => runtime.receive({ kind: "unknown", name: "nope" }), NativeRuntimeError);
  assert.throws(() => runtime.receive({ kind: "event", name: "" }), NativeRuntimeError);
  assert.throws(() => runtime.receive({ kind: "response", id: "x", ok: "yes" }), NativeRuntimeError);
  assert.throws(() => runtime.receive({ kind: "response", id: "missing", ok: true }), NativeRuntimeError);
});

test("cleans pending requests when the host channel send fails", async () => {
  const runtime = createNativeRuntime({
    channel: {
      send() {
        throw new NativeRuntimeError("host channel closed");
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
  const root = await import("@ts-zero/native-runtime");
  const channel = await import("@ts-zero/native-runtime/channel");
  const errors = await import("@ts-zero/native-runtime/errors");
  const handles = await import("@ts-zero/native-runtime/handles");
  const runtime = await import("@ts-zero/native-runtime/runtime");
  const serializable = await import("@ts-zero/native-runtime/serializable");
  const types = await import("@ts-zero/native-runtime/types");

  assert.equal(root.createNativeRuntime, createNativeRuntime);
  assert.equal(channel.createMemoryHostChannel, createMemoryHostChannelFromSubpath);
  assert.equal(errors.NativeRuntimeError, NativeRuntimeError);
  assert.equal(handles.createNativeHandle, createNativeHandleFromSubpath);
  assert.equal(runtime.createNativeRuntime, createNativeRuntimeFromSubpath);
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
