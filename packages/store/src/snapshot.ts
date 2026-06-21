import { fail } from "./errors.js";
import type { StorePatch, StoreSnapshot, StoreVersion } from "./types.js";

export function createSnapshot<State>(version: StoreVersion, state: State): StoreSnapshot<State> {
  assertVersion(version, "snapshot version");

  return {
    version,
    state,
  };
}

export function createReplacePatch<State>(
  from: StoreVersion,
  to: StoreVersion,
  state: State,
): StorePatch<State> {
  assertVersion(from, "patch from version");
  assertVersion(to, "patch to version");

  if (to <= from) {
    fail("Patch target version must be greater than source version");
  }

  return {
    kind: "replace",
    from,
    to,
    state,
  };
}

export function assertVersion(version: StoreVersion, label: string): void {
  if (!Number.isSafeInteger(version) || version < 0) {
    fail(`Expected ${label} to be a non-negative safe integer`);
  }
}
