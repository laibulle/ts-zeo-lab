import type { UUID, V1Options } from "./types.js";
import { copyBytes } from "./bytes.js";
import { parse, version } from "./format.js";
import { unsafeStringify } from "./stringify-unsafe.js";
import { createV1Bytes, timestampToV1Bytes, v1BytesToTimestamp } from "./v1.js";

export function v6(): UUID;
export function v6(options: V1Options): UUID;
export function v6(options: V1Options | undefined, buffer: Uint8Array, offset?: number): Uint8Array;
export function v6(options?: V1Options, buffer?: Uint8Array, offset = 0): UUID | Uint8Array {
  const bytes = v1BytesToV6Bytes(createV1Bytes(options));

  if (buffer) {
    copyBytes(bytes, buffer, offset);
    return buffer;
  }

  return unsafeStringify(bytes);
}

export function v1ToV6(uuid: string): UUID {
  if (version(uuid) !== 1) {
    throw new TypeError(`Expected UUID version 1: ${uuid}`);
  }

  return unsafeStringify(v1BytesToV6Bytes(parse(uuid)));
}

export function v6ToV1(uuid: string): UUID {
  if (version(uuid) !== 6) {
    throw new TypeError(`Expected UUID version 6: ${uuid}`);
  }

  return unsafeStringify(v6BytesToV1Bytes(parse(uuid)));
}

export function v1BytesToV6Bytes(bytes: Uint8Array): Uint8Array {
  const timestamp = v1BytesToTimestamp(bytes);
  const output = timestampToV6Bytes(timestamp);

  output[8] = bytes[8] ?? 0;
  output[9] = bytes[9] ?? 0;
  output.set(bytes.slice(10, 16), 10);

  return output;
}

function v6BytesToV1Bytes(bytes: Uint8Array): Uint8Array {
  const timestamp =
    (BigInt(bytes[0] ?? 0) << 52n) |
    (BigInt(bytes[1] ?? 0) << 44n) |
    (BigInt(bytes[2] ?? 0) << 36n) |
    (BigInt(bytes[3] ?? 0) << 28n) |
    (BigInt(bytes[4] ?? 0) << 20n) |
    (BigInt(bytes[5] ?? 0) << 12n) |
    (BigInt((bytes[6] ?? 0) & 0x0f) << 8n) |
    BigInt(bytes[7] ?? 0);
  const output = timestampToV1Bytes(timestamp);

  output[8] = bytes[8] ?? 0;
  output[9] = bytes[9] ?? 0;
  output.set(bytes.slice(10, 16), 10);

  return output;
}

function timestampToV6Bytes(timestamp: bigint): Uint8Array {
  const bytes = new Uint8Array(16);

  bytes[0] = Number((timestamp >> 52n) & 0xffn);
  bytes[1] = Number((timestamp >> 44n) & 0xffn);
  bytes[2] = Number((timestamp >> 36n) & 0xffn);
  bytes[3] = Number((timestamp >> 28n) & 0xffn);
  bytes[4] = Number((timestamp >> 20n) & 0xffn);
  bytes[5] = Number((timestamp >> 12n) & 0xffn);
  bytes[6] = Number(((timestamp >> 8n) & 0x0fn) | 0x60n);
  bytes[7] = Number(timestamp & 0xffn);

  return bytes;
}
