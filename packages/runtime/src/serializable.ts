import { fail } from "./errors.js";
import type { Serializable } from "./types.js";

const MAX_DEPTH = 64;

export function assertSerializable(value: unknown, label = "value"): asserts value is Serializable {
  visit(value, label, 0, new Set<object>());
}

function visit(value: unknown, path: string, depth: number, seen: Set<object>): void {
  if (depth > MAX_DEPTH) {
    fail(`Expected ${path} to be serializable: maximum depth exceeded`);
  }

  if (value === null) {
    return;
  }

  switch (typeof value) {
    case "boolean":
    case "string":
      return;
    case "number":
      if (!Number.isFinite(value)) {
        fail(`Expected ${path} to be a finite number`);
      }
      return;
    case "object":
      visitObject(value, path, depth, seen);
      return;
    default:
      fail(`Expected ${path} to be serializable`);
  }
}

function visitObject(value: object, path: string, depth: number, seen: Set<object>): void {
  if (seen.has(value)) {
    fail(`Expected ${path} to be acyclic`);
  }

  seen.add(value);

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      visit(value[index], `${path}[${index}]`, depth + 1, seen);
    }

    seen.delete(value);
    return;
  }

  const prototype = Object.getPrototypeOf(value);

  if (prototype !== Object.prototype && prototype !== null) {
    fail(`Expected ${path} to be a plain object`);
  }

  for (const [key, entry] of Object.entries(value)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      fail(`Expected ${path} to avoid unsafe key: ${key}`);
    }

    visit(entry, `${path}.${key}`, depth + 1, seen);
  }

  seen.delete(value);
}
