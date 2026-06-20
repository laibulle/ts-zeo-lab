import type { UUID, V7Options } from "./types.js";
import { assertTargetBuffer, assertUint } from "./bytes.js";
import { unsafeStringify } from "./stringify-unsafe.js";
import { randomBytesInto, readRandomByte } from "./rng.js";

const UINT_48_MAX = 0xffffffffffff;
const UINT_32_MAX = 0xffffffff;

let v7State:
  | {
      msecs: number;
      seq: number;
    }
  | undefined;

export function v7(): UUID;
export function v7(options: V7Options): UUID;
export function v7(options: V7Options | undefined, buffer: Uint8Array, offset?: number): Uint8Array;
export function v7(options?: V7Options, buffer?: Uint8Array, offset = 0): UUID | Uint8Array {
  if (buffer) {
    writeV7Bytes(options, buffer, offset);
    return buffer;
  }

  const bytes = new Uint8Array(16);

  writeV7Bytes(options, bytes, 0);

  return unsafeStringify(bytes);
}

function writeV7Bytes(options: V7Options | undefined, target: Uint8Array, offset: number): void {
  assertTargetBuffer(target, offset, 16);

  const source = options?.random ?? options?.rng?.();

  if (!source) {
    randomBytesInto(target, offset, 16);
  } else if (source.length < 16) {
    throw new TypeError("Expected at least 16 random bytes");
  }

  const msecs = normalizeUnixMilliseconds(options?.msecs ?? Date.now());
  const useState = options === undefined;
  let seq = options?.seq;

  if (seq !== undefined) {
    assertUint(seq, UINT_32_MAX, "seq");
  } else if (useState) {
    if (!v7State || msecs > v7State.msecs) {
      seq =
        ((readRandomByte(source, target, offset, 6) << 24) |
          (readRandomByte(source, target, offset, 7) << 16) |
          (readRandomByte(source, target, offset, 8) << 8) |
          readRandomByte(source, target, offset, 9)) >>>
        0;
    } else {
      if (v7State.seq === UINT_32_MAX) {
        throw new RangeError("Can't create more UUIDv7 values for the same millisecond");
      }

      seq = (v7State.seq + 1) >>> 0;
    }
  } else {
    seq =
      ((readRandomByte(source, target, offset, 6) << 24) |
        (readRandomByte(source, target, offset, 7) << 16) |
        (readRandomByte(source, target, offset, 8) << 8) |
        readRandomByte(source, target, offset, 9)) >>>
      0;
  }

  const timestampHigh = Math.floor(msecs / 0x100000000);
  const timestampLow = msecs >>> 0;

  target[offset] = (timestampHigh >>> 8) & 0xff;
  target[offset + 1] = timestampHigh & 0xff;
  target[offset + 2] = (timestampLow >>> 24) & 0xff;
  target[offset + 3] = (timestampLow >>> 16) & 0xff;
  target[offset + 4] = (timestampLow >>> 8) & 0xff;
  target[offset + 5] = timestampLow & 0xff;
  target[offset + 6] = 0x70 | ((seq >>> 28) & 0x0f);
  target[offset + 7] = (seq >>> 20) & 0xff;
  target[offset + 8] = 0x80 | ((seq >>> 14) & 0x3f);
  target[offset + 9] = (seq >>> 6) & 0xff;
  target[offset + 10] = ((seq & 0x3f) << 2) | (readRandomByte(source, target, offset, 10) & 0x03);
  target[offset + 11] = readRandomByte(source, target, offset, 11);
  target[offset + 12] = readRandomByte(source, target, offset, 12);
  target[offset + 13] = readRandomByte(source, target, offset, 13);
  target[offset + 14] = readRandomByte(source, target, offset, 14);
  target[offset + 15] = readRandomByte(source, target, offset, 15);

  if (useState) {
    v7State = { msecs, seq };
  }
}

function normalizeUnixMilliseconds(value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > UINT_48_MAX) {
    throw new RangeError(`Invalid unix milliseconds value: ${value}`);
  }

  return value;
}
