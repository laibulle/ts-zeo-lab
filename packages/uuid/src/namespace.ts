import type { UUID, UUIDName } from "./types.js";
import { copyArrayLike, concat, copyBytes } from "./bytes.js";
import { unsafeStringify } from "./stringify-unsafe.js";
import { resolveNamespaceBytes } from "./namespaces.js";

const TEXT_ENCODER = new TextEncoder();

export function namespaceUuid(
  uuidVersion: 3 | 5,
  hash: (bytes: Uint8Array) => Uint8Array,
  name: UUIDName,
  namespace: string | ArrayLike<number>,
  buffer?: Uint8Array,
  offset = 0,
): UUID | Uint8Array {
  const namespaceBytes = resolveNamespaceBytes(namespace);
  const nameBytes = typeof name === "string" ? utf8(name) : copyArrayLike(name, name.length);
  const bytes = hash(concat(namespaceBytes, nameBytes)).slice(0, 16);

  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | (uuidVersion << 4);
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;

  if (buffer) {
    copyBytes(bytes, buffer, offset);
    return buffer;
  }

  return unsafeStringify(bytes);
}

function utf8(value: string): Uint8Array {
  return TEXT_ENCODER.encode(value);
}
