import { fail } from "./errors.js";
import type { MutationActionResult, MutationResult, MutationStore } from "./types.js";

export function applyMutationResult<Snapshot, Payload>(
  store: MutationStore<Snapshot, Payload>,
  result: MutationResult<Snapshot, Payload>,
): Snapshot {
  validateStore(store);

  if (result.kind === "snapshot") {
    return store.hydrate(result.snapshot);
  }

  applyActionResult(store, result);

  return store.snapshot();
}

export function applyActionResult<Snapshot, Payload>(
  store: MutationStore<Snapshot, Payload>,
  result: MutationActionResult<Payload>,
): void {
  validateStore(store);

  if (store.version() !== result.previousVersion) {
    fail("Mutation result does not match the local store version");
  }

  store.dispatch(result.action.type, result.action.payload);

  if (store.version() !== result.version) {
    fail("Mutation action produced an unexpected store version");
  }
}

function validateStore<Snapshot, Payload>(store: MutationStore<Snapshot, Payload>): void {
  if (
    store === null ||
    typeof store !== "object" ||
    typeof store.version !== "function" ||
    typeof store.snapshot !== "function" ||
    typeof store.dispatch !== "function" ||
    typeof store.hydrate !== "function"
  ) {
    fail("Expected mutation store");
  }
}
