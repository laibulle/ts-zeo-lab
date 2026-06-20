import { fail } from "./errors.js";
import { assertBoundary } from "./validation.js";
import type { RandomBytes } from "./types.js";

const HEX = "0123456789abcdef";

export function createBoundary(randomBytes: RandomBytes = secureRandomBytes): string {
  const bytes = new Uint8Array(24);
  randomBytes(bytes);

  let value = "ts-zero-";

  for (const byte of bytes) {
    value += HEX[byte >>> 4] + HEX[byte & 0x0f];
  }

  assertBoundary(value);
  return value;
}

function secureRandomBytes(target: Uint8Array): Uint8Array {
  const crypto = globalThis.crypto;

  if (crypto === undefined || typeof crypto.getRandomValues !== "function") {
    fail("Secure random values are unavailable");
  }

  crypto.getRandomValues(target);
  return target;
}
