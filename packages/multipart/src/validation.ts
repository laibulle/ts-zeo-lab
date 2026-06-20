import { fail } from "./errors.js";

const BOUNDARY_PATTERN = /^[A-Za-z0-9'()+_,\-./:=?]{1,70}$/;
const TOKEN_PATTERN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+\/[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

export function assertHeaderParameter(name: string, value: string): void {
  if (typeof value !== "string" || value.length === 0) {
    fail(`Expected multipart ${name} to be a non-empty string`);
  }

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);

    if (code <= 0x1f || code === 0x22 || code === 0x5c || code === 0x7f) {
      fail(`Invalid multipart ${name}`);
    }
  }
}

export function assertBoundaryNotInBody(boundary: string, body: Uint8Array): void {
  const marker = new TextEncoder().encode(`--${boundary}`);

  if (contains(body, marker)) {
    fail("Multipart boundary must not appear in part bodies");
  }
}

function contains(body: Uint8Array, needle: Uint8Array): boolean {
  if (needle.length === 0 || needle.length > body.length) {
    return false;
  }

  const lastStart = body.length - needle.length;

  for (let start = 0; start <= lastStart; start += 1) {
    let matched = true;

    for (let index = 0; index < needle.length; index += 1) {
      if (body[start + index] !== needle[index]) {
        matched = false;
        break;
      }
    }

    if (matched) {
      return true;
    }
  }

  return false;
}

export function assertContentType(value: string): void {
  if (!TOKEN_PATTERN.test(value)) {
    fail("Invalid multipart content type");
  }
}

export function assertBoundary(value: string): void {
  if (!BOUNDARY_PATTERN.test(value)) {
    fail("Invalid multipart boundary");
  }
}
