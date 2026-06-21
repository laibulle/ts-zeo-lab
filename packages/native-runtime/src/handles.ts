import { fail } from "./errors.js";
import { assertSerializable } from "./serializable.js";
import type { NativeHandle, Serializable } from "./types.js";

export function createNativeHandle(kind: string, id: string, meta?: Serializable): NativeHandle {
  if (typeof kind !== "string" || kind.length === 0) {
    fail("Expected native handle kind to be a non-empty string");
  }

  if (typeof id !== "string" || id.length === 0) {
    fail("Expected native handle id to be a non-empty string");
  }

  if (meta !== undefined) {
    assertSerializable(meta);
  }

  return Object.freeze({
    kind,
    id,
    meta,
    nativeHandle: true,
  });
}

export function isNativeHandle(value: unknown): value is NativeHandle {
  return value !== null
    && typeof value === "object"
    && (value as NativeHandle).nativeHandle === true
    && typeof (value as NativeHandle).kind === "string"
    && typeof (value as NativeHandle).id === "string";
}
