import type { UUID } from "./types.js";
import { unsafeStringify } from "./stringify-unsafe.js";

export type { UUID } from "./types.js";

export const NIL = "00000000-0000-0000-0000-000000000000";
export const MAX = "ffffffff-ffff-ffff-ffff-ffffffffffff";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const BYTE_TO_HEX: number[] = Array.from({ length: 256 }, (_, index) => {
  if (index >= 48 && index <= 57) {
    return index - 48;
  }

  if (index >= 65 && index <= 70) {
    return index - 55;
  }

  if (index >= 97 && index <= 102) {
    return index - 87;
  }

  return -1;
});

export function validate(value: unknown): value is UUID {
  if (typeof value !== "string") {
    return false;
  }

  return UUID_PATTERN.test(value) || isNilOrMax(value);
}

export function version(value: string): number {
  if (!validate(value)) {
    throw new TypeError(`Invalid UUID: ${value}`);
  }

  return Number.parseInt(value[14] ?? "", 16);
}

export function parse(value: string): Uint8Array {
  if (!validate(value)) {
    throw new TypeError(`Invalid UUID: ${value}`);
  }

  const bytes = new Uint8Array(16);

  bytes[0] = parseByte(value, 0);
  bytes[1] = parseByte(value, 2);
  bytes[2] = parseByte(value, 4);
  bytes[3] = parseByte(value, 6);
  bytes[4] = parseByte(value, 9);
  bytes[5] = parseByte(value, 11);
  bytes[6] = parseByte(value, 14);
  bytes[7] = parseByte(value, 16);
  bytes[8] = parseByte(value, 19);
  bytes[9] = parseByte(value, 21);
  bytes[10] = parseByte(value, 24);
  bytes[11] = parseByte(value, 26);
  bytes[12] = parseByte(value, 28);
  bytes[13] = parseByte(value, 30);
  bytes[14] = parseByte(value, 32);
  bytes[15] = parseByte(value, 34);

  return bytes;
}

export function stringify(bytes: ArrayLike<number>, offset = 0): UUID {
  assertByteArray(bytes, offset);

  if (!hasValidVersionAndVariant(bytes, offset)) {
    throw new TypeError(`Stringified UUID is invalid: ${unsafeStringify(bytes, offset)}`);
  }

  return unsafeStringify(bytes, offset);
}

function parseByte(value: string, offset: number): number {
  const high = BYTE_TO_HEX[value.charCodeAt(offset)] ?? -1;
  const low = BYTE_TO_HEX[value.charCodeAt(offset + 1)] ?? -1;

  if (high < 0 || low < 0) {
    throw new TypeError(`Invalid UUID: ${value}`);
  }

  return (high << 4) | low;
}

function hasValidVersionAndVariant(bytes: ArrayLike<number>, offset: number): boolean {
  const versionNibble = ((bytes[offset + 6] ?? 0) & 0xf0) >>> 4;
  const variant = (bytes[offset + 8] ?? 0) & 0xc0;

  return versionNibble >= 1 && versionNibble <= 8 && variant === 0x80;
}

function isNilOrMax(value: string): boolean {
  if (
    value.length !== 36 ||
    value.charCodeAt(8) !== 45 ||
    value.charCodeAt(13) !== 45 ||
    value.charCodeAt(18) !== 45 ||
    value.charCodeAt(23) !== 45
  ) {
    return false;
  }

  let nil = true;
  let max = true;

  for (let index = 0; index < 36; index += 1) {
    if (index === 8 || index === 13 || index === 18 || index === 23) {
      continue;
    }

    const code = value.charCodeAt(index);

    nil = nil && code === 48;
    max = max && (code === 102 || code === 70);

    if (!nil && !max) {
      return false;
    }
  }

  return nil || max;
}

function assertByteArray(bytes: ArrayLike<number>, offset: number): void {
  if (!Number.isInteger(offset) || offset < 0) {
    throw new RangeError(`Invalid offset: ${offset}`);
  }

  if (bytes.length - offset < 16) {
    throw new TypeError("Expected at least 16 bytes");
  }

  for (let index = offset; index < offset + 16; index += 1) {
    const byte = bytes[index];

    if (byte === undefined || !Number.isInteger(byte) || byte < 0 || byte > 255) {
      throw new TypeError(`Invalid byte at index ${index}`);
    }
  }
}
