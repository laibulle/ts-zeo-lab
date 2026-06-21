import { fail } from "./errors.js";
import { assertSerializable } from "./serializable.js";
import type { ResourceHandle, Serializable } from "./types.js";

export function createResourceHandle(kind: string, id: string, meta?: Serializable): ResourceHandle {
  if (typeof kind !== "string" || kind.length === 0) {
    fail("Expected resource handle kind to be a non-empty string");
  }

  if (typeof id !== "string" || id.length === 0) {
    fail("Expected resource handle id to be a non-empty string");
  }

  if (meta !== undefined) {
    assertSerializable(meta);
  }

  return Object.freeze({
    kind,
    id,
    meta,
    resourceHandle: true,
  });
}

export function isResourceHandle(value: unknown): value is ResourceHandle {
  return value !== null
    && typeof value === "object"
    && (value as ResourceHandle).resourceHandle === true
    && typeof (value as ResourceHandle).kind === "string"
    && typeof (value as ResourceHandle).id === "string";
}
