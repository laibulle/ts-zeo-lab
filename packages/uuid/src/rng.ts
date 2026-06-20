import type { RandomBytes, V1Options, V4Options, V7Options } from "./types.js";
import { assertByte, assertTargetBuffer } from "./bytes.js";

const RANDOM_POOL_SIZE = 256;
const RANDOM_POOL = new Uint8Array(RANDOM_POOL_SIZE);
let randomPoolOffset = RANDOM_POOL_SIZE;

export function readRandomByte(
  source: RandomBytes | undefined,
  target: Uint8Array,
  offset: number,
  index: number,
): number {
  if (!source) {
    return target[offset + index] ?? 0;
  }

  const byte = source[index];

  if (source instanceof Uint8Array) {
    return byte ?? 0;
  }

  assertByte(byte, index);

  return byte;
}

export function writeRandomBytes(
  options: V1Options | V4Options | V7Options | undefined,
  target: Uint8Array,
  offset: number,
  count: number,
): void {
  assertTargetBuffer(target, offset, count);

  const source = options?.random ?? options?.rng?.();

  if (!source) {
    randomBytesInto(target, offset, count);
    return;
  }

  if (source.length < count) {
    throw new TypeError(`Expected at least ${count} random bytes`);
  }

  if (source instanceof Uint8Array) {
    if (count === 16) {
      target[offset] = source[0] ?? 0;
      target[offset + 1] = source[1] ?? 0;
      target[offset + 2] = source[2] ?? 0;
      target[offset + 3] = source[3] ?? 0;
      target[offset + 4] = source[4] ?? 0;
      target[offset + 5] = source[5] ?? 0;
      target[offset + 6] = source[6] ?? 0;
      target[offset + 7] = source[7] ?? 0;
      target[offset + 8] = source[8] ?? 0;
      target[offset + 9] = source[9] ?? 0;
      target[offset + 10] = source[10] ?? 0;
      target[offset + 11] = source[11] ?? 0;
      target[offset + 12] = source[12] ?? 0;
      target[offset + 13] = source[13] ?? 0;
      target[offset + 14] = source[14] ?? 0;
      target[offset + 15] = source[15] ?? 0;
      return;
    }

    target.set(source.subarray(0, count), offset);
    return;
  }

  for (let index = 0; index < count; index += 1) {
    const byte = source[index];

    assertByte(byte, index);
    target[offset + index] = byte;
  }
}

export function getRandomBytes(options: V1Options | V4Options | V7Options | undefined, count: number): Uint8Array {
  const bytes = new Uint8Array(count);

  writeRandomBytes(options, bytes, 0, count);

  return bytes;
}

export function randomBytesInto(target: Uint8Array, offset: number, count: number): void {
  const crypto = globalThis.crypto;

  if (!crypto?.getRandomValues) {
    throw new Error("crypto.getRandomValues is unavailable");
  }

  if (count > RANDOM_POOL_SIZE) {
    crypto.getRandomValues(target.subarray(offset, offset + count));
    return;
  }

  if (randomPoolOffset + count > RANDOM_POOL_SIZE) {
    crypto.getRandomValues(RANDOM_POOL);
    randomPoolOffset = 0;
  }

  for (let index = 0; index < count; index += 1) {
    target[offset + index] = RANDOM_POOL[randomPoolOffset + index] ?? 0;
  }

  randomPoolOffset += count;
}
