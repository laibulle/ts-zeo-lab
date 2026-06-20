import type { UUID, V4Options } from "./types.js";
import { unsafeStringify } from "./stringify-unsafe.js";
import { writeRandomBytes } from "./rng.js";

export function v4(): UUID;
export function v4(options: V4Options): UUID;
export function v4(options: V4Options | undefined, buffer: Uint8Array, offset?: number): Uint8Array;
export function v4(options?: V4Options, buffer?: Uint8Array, offset = 0): UUID | Uint8Array {
  if (buffer) {
    writeV4Bytes(options, buffer, offset);
    return buffer;
  }

  const bytes = new Uint8Array(16);

  writeV4Bytes(options, bytes, 0);

  return unsafeStringify(bytes);
}

function writeV4Bytes(options: V4Options | undefined, target: Uint8Array, offset: number): void {
  writeRandomBytes(options, target, offset, 16);
  target[offset + 6] = ((target[offset + 6] ?? 0) & 0x0f) | 0x40;
  target[offset + 8] = ((target[offset + 8] ?? 0) & 0x3f) | 0x80;
}
