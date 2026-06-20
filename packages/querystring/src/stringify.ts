import { encode } from "./codec.js";
import { fail } from "./errors.js";
import { isForbiddenKey } from "./security.js";
import type { StringifiableArray, StringifiableObject, StringifiablePrimitive, StringifyQueryOptions } from "./types.js";

const DEFAULT_DEPTH = 5;

export function stringifyQuery(input: StringifiableObject, options: StringifyQueryOptions = {}): string {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    fail("Expected query string input to be an object");
  }

  const delimiter = options.delimiter ?? "&";
  const depth = normalizeLimit(options.depth ?? DEFAULT_DEPTH, "depth");
  const shouldEncode = options.encode ?? true;

  if (typeof delimiter !== "string" || delimiter.length === 0) {
    fail("Expected delimiter to be a non-empty string");
  }

  if (typeof shouldEncode !== "boolean") {
    fail("Expected encode to be a boolean");
  }

  const pairs: string[] = [];
  appendObject(pairs, "", input, shouldEncode, depth, 0, []);
  return pairs.join(delimiter);
}

function normalizeLimit(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    fail(`Expected ${name} to be a non-negative safe integer`);
  }

  return value;
}

function appendObject(
  pairs: string[],
  prefix: string,
  object: StringifiableObject,
  shouldEncode: boolean,
  maxDepth: number,
  depth: number,
  seen: readonly object[],
): void {
  if (depth > maxDepth) {
    fail("Query string depth limit exceeded");
  }

  if (seen.includes(object)) {
    fail("Cannot stringify circular query string objects");
  }

  const nextSeen = [...seen, object];

  for (const key of Object.keys(object)) {
    validateKey(key);

    if (isForbiddenKey(key)) {
      continue;
    }

    const value = object[key];

    if (value === undefined) {
      continue;
    }

    const nextPrefix = prefix.length === 0 ? key : `${prefix}[${key}]`;

    if (Array.isArray(value)) {
      appendArray(pairs, nextPrefix, value, shouldEncode);
      continue;
    }

    if (value !== null && typeof value === "object") {
      appendObject(pairs, nextPrefix, value as StringifiableObject, shouldEncode, maxDepth, depth + 1, nextSeen);
      continue;
    }

    appendPair(pairs, nextPrefix, value, shouldEncode);
  }
}

function validateKey(key: string): void {
  if (key.length === 0) {
    fail("Empty query string keys are not supported");
  }

  if (key.includes("[") || key.includes("]")) {
    fail("Query string keys must not contain brackets");
  }
}

function appendArray(pairs: string[], key: string, values: StringifiableArray, shouldEncode: boolean): void {
  for (const value of values) {
    if (value === undefined) {
      continue;
    }

    if (value !== null && typeof value === "object") {
      fail("Arrays of objects are not supported");
    }

    appendPair(pairs, `${key}[]`, value, shouldEncode);
  }
}

function appendPair(pairs: string[], key: string, value: StringifiablePrimitive, shouldEncode: boolean): void {
  const stringValue = value === null || value === undefined ? "" : stringifyPrimitive(value);

  if (shouldEncode) {
    pairs.push(`${encode(key)}=${encode(stringValue)}`);
    return;
  }

  pairs.push(`${key}=${stringValue}`);
}

function stringifyPrimitive(value: Exclude<StringifiablePrimitive, null | undefined>): string {
  if (typeof value === "number" && !Number.isFinite(value)) {
    fail("Cannot stringify non-finite numbers");
  }

  return String(value);
}
