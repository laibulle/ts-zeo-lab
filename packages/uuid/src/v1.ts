import type { RandomBytes, UUID, V1Options } from "./types.js";
import { copyArrayLike, copyBytes } from "./bytes.js";
import { unsafeStringify } from "./stringify-unsafe.js";
import { getRandomBytes } from "./rng.js";

const UUID_EPOCH_OFFSET_MS = 12_219_292_800_000n;
const UINT_14_MAX = 0x3fff;

let v1State:
  | {
      node: Uint8Array;
      clockseq: number;
      msecs: number;
      nsecs: number;
    }
  | undefined;

export function v1(): UUID;
export function v1(options: V1Options): UUID;
export function v1(options: V1Options | undefined, buffer: Uint8Array, offset?: number): Uint8Array;
export function v1(options?: V1Options, buffer?: Uint8Array, offset = 0): UUID | Uint8Array {
  const bytes = createV1Bytes(options);

  if (buffer) {
    copyBytes(bytes, buffer, offset);
    return buffer;
  }

  return unsafeStringify(bytes);
}

export function createV1Bytes(options?: V1Options): Uint8Array {
  const useState = options === undefined;
  const now = options?.msecs ?? Date.now();
  let state = useState ? v1State : undefined;
  let random: Uint8Array | undefined;

  if (!state) {
    if (!options?.node || options.clockseq === undefined) {
      random = getRandomBytes(options, 16);
    }

    state = {
      node: options?.node ? copyArrayLike(options.node, 6) : createNodeId(undefined, random ?? getRandomBytes(options, 16)),
      clockseq: options?.clockseq ?? deriveClockseq(random ?? getRandomBytes(options, 16)),
      msecs: now,
      nsecs: options?.nsecs ?? 0,
    };
  }

  let msecs = options?.msecs ?? now;
  let nsecs = options?.nsecs ?? (useState ? state.nsecs + 1 : 0);
  let clockseq = options?.clockseq ?? state.clockseq;
  const node = createNodeId(options?.node, state.node);

  if (clockseq < 0 || clockseq > UINT_14_MAX || !Number.isInteger(clockseq)) {
    throw new RangeError(`Invalid clockseq: ${clockseq}`);
  }

  if (nsecs < 0 || nsecs >= 10_000 || !Number.isInteger(nsecs)) {
    throw new RangeError("Can't create more than 10M UUIDs/sec");
  }

  if (useState && msecs < state.msecs) {
    clockseq = (clockseq + 1) & UINT_14_MAX;
  }

  if (useState && msecs !== state.msecs) {
    nsecs = 0;
  }

  if (!Number.isInteger(msecs) || msecs < 0) {
    throw new RangeError(`Invalid unix milliseconds value: ${msecs}`);
  }

  const timestamp = (BigInt(msecs) + UUID_EPOCH_OFFSET_MS) * 10_000n + BigInt(nsecs);
  const bytes = timestampToV1Bytes(timestamp);

  bytes[8] = (clockseq >>> 8) | 0x80;
  bytes[9] = clockseq & 0xff;
  bytes.set(node, 10);

  if (useState) {
    v1State = { node, clockseq, msecs, nsecs };
  }

  return bytes;
}

export function v1BytesToTimestamp(bytes: Uint8Array): bigint {
  return (
    (BigInt((bytes[6] ?? 0) & 0x0f) << 56n) |
    (BigInt(bytes[7] ?? 0) << 48n) |
    (BigInt(bytes[4] ?? 0) << 40n) |
    (BigInt(bytes[5] ?? 0) << 32n) |
    (BigInt(bytes[0] ?? 0) << 24n) |
    (BigInt(bytes[1] ?? 0) << 16n) |
    (BigInt(bytes[2] ?? 0) << 8n) |
    BigInt(bytes[3] ?? 0)
  );
}

export function timestampToV1Bytes(timestamp: bigint): Uint8Array {
  const bytes = new Uint8Array(16);

  bytes[0] = Number((timestamp >> 24n) & 0xffn);
  bytes[1] = Number((timestamp >> 16n) & 0xffn);
  bytes[2] = Number((timestamp >> 8n) & 0xffn);
  bytes[3] = Number(timestamp & 0xffn);
  bytes[4] = Number((timestamp >> 40n) & 0xffn);
  bytes[5] = Number((timestamp >> 32n) & 0xffn);
  bytes[6] = Number(((timestamp >> 56n) & 0x0fn) | 0x10n);
  bytes[7] = Number((timestamp >> 48n) & 0xffn);

  return bytes;
}

function createNodeId(node: RandomBytes | undefined, fallback: RandomBytes): Uint8Array {
  const bytes = node ? copyArrayLike(node, 6) : copyArrayLike(fallback, 6);

  if (!node) {
    bytes[0] = (bytes[0] ?? 0) | 0x01;
  }

  return bytes;
}

function deriveClockseq(random: RandomBytes): number {
  return (((random[6] ?? 0) << 8) | (random[7] ?? 0)) & UINT_14_MAX;
}
