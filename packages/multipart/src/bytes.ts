import { fail } from "./errors.js";
import type { MultipartBytes } from "./types.js";

const encoder = new TextEncoder();

export function utf8(value: string): Uint8Array {
  return encoder.encode(value);
}

export function asBytes(value: MultipartBytes): Uint8Array {
  if (value instanceof Uint8Array) {
    return value;
  }

  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }

  if (Array.isArray(value)) {
    const output = new Uint8Array(value.length);

    for (let index = 0; index < value.length; index += 1) {
      const byte = value[index];

      if (!Number.isInteger(byte) || byte < 0 || byte > 0xff) {
        fail("Expected file body byte values to be integers between 0 and 255");
      }

      output[index] = byte;
    }

    return output;
  }

  fail("Expected file body to be bytes");
}

export function concat(chunks: readonly Uint8Array[]): Uint8Array {
  let size = 0;

  for (const chunk of chunks) {
    size += chunk.length;
  }

  const output = new Uint8Array(size);
  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }

  return output;
}
