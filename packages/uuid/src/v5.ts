import type { UUID, UUIDName } from "./types.js";
import { namespaceUuid } from "./namespace.js";
import { sha1 } from "./hash.js";

export function v5(name: UUIDName, namespace: string | ArrayLike<number>): UUID;
export function v5(
  name: UUIDName,
  namespace: string | ArrayLike<number>,
  buffer: Uint8Array,
  offset?: number,
): Uint8Array;
export function v5(
  name: UUIDName,
  namespace: string | ArrayLike<number>,
  buffer?: Uint8Array,
  offset = 0,
): UUID | Uint8Array {
  return namespaceUuid(5, sha1, name, namespace, buffer, offset);
}

export namespace v5 {
  export const DNS = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
  export const URL = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";
}
