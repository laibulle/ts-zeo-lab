import { decode } from "./codec.js";
import { fail } from "./errors.js";
import { createNullObject, isForbiddenKey } from "./security.js";
import type { ParseQueryOptions, ParsedQuery, QueryArray, QueryObject } from "./types.js";

const DEFAULT_DEPTH = 5;
const DEFAULT_PARAMETER_LIMIT = 1_000;

export function parseQuery(input: string, options: ParseQueryOptions = {}): ParsedQuery {
  if (typeof input !== "string") {
    fail("Expected query string input to be a string");
  }

  const delimiter = options.delimiter ?? "&";
  const depth = normalizeLimit(options.depth ?? DEFAULT_DEPTH, "depth");
  const parameterLimit = normalizeLimit(options.parameterLimit ?? DEFAULT_PARAMETER_LIMIT, "parameterLimit");
  const plusAsSpace = options.plusAsSpace ?? true;
  const query = input.charCodeAt(0) === 0x3f ? input.slice(1) : input;
  const result = createNullObject() as ParsedQuery;

  if (typeof delimiter !== "string" || delimiter.length === 0) {
    fail("Expected delimiter to be a non-empty string");
  }

  if (typeof plusAsSpace !== "boolean") {
    fail("Expected plusAsSpace to be a boolean");
  }

  if (query.length === 0) {
    return result;
  }

  let pairCount = 0;
  let start = 0;

  while (start <= query.length) {
    const delimiterIndex = query.indexOf(delimiter, start);
    const end = delimiterIndex === -1 ? query.length : delimiterIndex;
    const pair = query.slice(start, end);

    if (pair.length === 0) {
      if (delimiterIndex === -1) {
        break;
      }

      start = end + delimiter.length;
      continue;
    }

    pairCount += 1;

    if (pairCount > parameterLimit) {
      fail("Query string parameter limit exceeded");
    }

    const equalsIndex = pair.indexOf("=");
    const rawKey = equalsIndex === -1 ? pair : pair.slice(0, equalsIndex);
    const rawValue = equalsIndex === -1 ? "" : pair.slice(equalsIndex + 1);
    const key = decode(rawKey, plusAsSpace);
    const value = decode(rawValue, plusAsSpace);
    const path = parseKeyPath(key, depth);

    if (!path.some(isForbiddenKey)) {
      assign(result, path, value);
    }

    if (delimiterIndex === -1) {
      break;
    }

    start = end + delimiter.length;
  }

  return result;
}

function normalizeLimit(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    fail(`Expected ${name} to be a non-negative safe integer`);
  }

  return value;
}

function parseKeyPath(key: string, depth: number): string[] {
  if (key.length === 0) {
    fail("Empty query string keys are not supported");
  }

  const firstBracket = key.indexOf("[");

  if (firstBracket === -1) {
    return [key];
  }

  const root = key.slice(0, firstBracket);

  if (root.length === 0) {
    fail("Array roots are not supported");
  }

  const path = [root];
  let index = firstBracket;

  while (index < key.length) {
    if (key.charCodeAt(index) !== 0x5b) {
      fail("Malformed bracket query string key");
    }

    const close = key.indexOf("]", index + 1);

    if (close === -1) {
      fail("Malformed bracket query string key");
    }

    const segment = key.slice(index + 1, close);

    if (segment.length === 0 && close !== key.length - 1) {
      fail("Nested arrays are not supported");
    }

    path.push(segment);
    index = close + 1;
  }

  if (path.length - 1 > depth) {
    fail("Query string depth limit exceeded");
  }

  return path;
}

function assign(target: QueryObject, path: string[], value: string): void {
  let current: QueryObject = target;

  for (let index = 0; index < path.length; index += 1) {
    const segment = path[index] as string;
    const isLast = index === path.length - 1;

    if (segment.length === 0) {
      if (!Array.isArray(current)) {
        fail("Array segment must be attached to an array");
      }

      if (!isLast) {
        fail("Nested arrays are not supported");
      }

      current.push(value);
      return;
    }

    if (isLast) {
      setLeaf(current, segment, value);
      return;
    }

    const nextSegment = path[index + 1] as string;
    const existing = current[segment];

    if (existing === undefined) {
      const next = nextSegment.length === 0 ? [] : createNullObject();
      current[segment] = next as QueryArray | QueryObject;
      current = next as QueryObject;
      continue;
    }

    if (typeof existing === "string") {
      fail("Cannot mix scalar and object query string values");
    }

    current = existing as QueryObject;
  }
}

function setLeaf(target: QueryObject, key: string, value: string): void {
  const existing = target[key];

  if (existing === undefined) {
    target[key] = value;
    return;
  }

  if (typeof existing === "string") {
    target[key] = [existing, value];
    return;
  }

  if (Array.isArray(existing)) {
    existing.push(value);
    return;
  }

  fail("Cannot mix object and scalar query string values");
}
