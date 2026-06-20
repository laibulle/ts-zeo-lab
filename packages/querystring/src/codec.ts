import { fail } from "./errors.js";

export function encode(value: string): string {
  return encodeURIComponent(value);
}

export function decode(value: string, plusAsSpace: boolean): string {
  const input = plusAsSpace ? value.replace(/\+/g, " ") : value;

  try {
    return decodeURIComponent(input);
  } catch {
    fail("Invalid percent-encoded query string component");
  }
}
