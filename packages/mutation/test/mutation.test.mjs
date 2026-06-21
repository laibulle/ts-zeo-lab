import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  applyMutationResult,
  createActionResult,
  createMutationRequest,
  createPendingMutation,
  createReconcileAcceptedResult,
  createReconcileRequest,
  createReconcileSnapshotResult,
  createSnapshotResult,
  getMutationRequest,
  getMutationResult,
  getReconcileRequest,
  getReconcileResult,
  isVersionCurrent,
  MutationError,
  shouldReplayMutation,
} from "../dist/index.js";
import { applyMutationResult as applyMutationResultFromSubpath } from "../dist/apply.js";
import { createMutationRequest as createMutationRequestFromSubpath } from "../dist/protocol.js";
import { createReconcileRequest as createReconcileRequestFromSubpath } from "../dist/reconcile.js";

function createCounterStore() {
  let version = 0;
  let state = { count: 0 };

  return {
    version: () => version,
    snapshot: () => ({ version, state }),
    dispatch(type, payload) {
      if (type !== "increment") {
        throw new Error("unknown action");
      }

      version += 1;
      state = { count: state.count + Number(payload ?? 1) };
    },
    hydrate(snapshot) {
      version = snapshot.version;
      state = snapshot.state;
      return snapshot;
    },
  };
}

test("creates explicit versioned mutation requests", () => {
  assert.deepEqual(createMutationRequest(2, "increment", 3), {
    version: 2,
    action: {
      type: "increment",
      payload: 3,
    },
  });
  assert.deepEqual(createMutationRequest(2, "increment"), {
    version: 2,
    action: {
      type: "increment",
    },
  });
});

test("creates compact action and snapshot results", () => {
  assert.deepEqual(createActionResult(2, 3, "increment", 1), {
    kind: "action",
    previousVersion: 2,
    version: 3,
    action: {
      type: "increment",
      payload: 1,
    },
  });
  assert.deepEqual(createSnapshotResult({ version: 7, state: { count: 4 } }), {
    kind: "snapshot",
    snapshot: {
      version: 7,
      state: {
        count: 4,
      },
    },
  });
});

test("validates requests and results fail-closed", () => {
  assert.throws(() => createMutationRequest(-1, "increment"), MutationError);
  assert.throws(() => createMutationRequest(0, ""), MutationError);
  assert.throws(() => createActionResult(1, 1, "increment"), MutationError);
  assert.throws(() => getMutationRequest({ version: 0, action: null }), MutationError);
  assert.throws(() => getMutationResult({ kind: "action", previousVersion: 0, version: 1 }), MutationError);

  const request = getMutationRequest({ version: 0, action: { type: "increment" } });

  assert.equal(isVersionCurrent(request, 0), true);
  assert.equal(isVersionCurrent(request, 1), false);
});

test("applies action results to compatible stores", () => {
  const store = createCounterStore();
  const snapshot = applyMutationResult(store, createActionResult(0, 1, "increment", 5));

  assert.deepEqual(snapshot, {
    version: 1,
    state: {
      count: 5,
    },
  });
});

test("hydrates snapshot results and rejects stale action results", () => {
  const store = createCounterStore();

  assert.deepEqual(applyMutationResult(store, createSnapshotResult({ version: 4, state: { count: 9 } })), {
    version: 4,
    state: {
      count: 9,
    },
  });
  assert.throws(() => applyMutationResult(store, createActionResult(0, 1, "increment", 1)), MutationError);
});

test("creates explicit offline reconcile requests", () => {
  const pending = createPendingMutation({
    id: "action-1",
    baseVersion: 4,
    action: {
      type: "increment",
      payload: 1,
    },
    createdAt: 12,
  });

  assert.deepEqual(pending, {
    id: "action-1",
    baseVersion: 4,
    action: {
      type: "increment",
      payload: 1,
    },
    createdAt: 12,
  });
  assert.deepEqual(createReconcileRequest({
    clientId: "client-1",
    lastSeenVersion: 4,
    actions: [pending],
  }), {
    clientId: "client-1",
    lastSeenVersion: 4,
    actions: [pending],
  });
});

test("creates and validates reconcile results", () => {
  assert.deepEqual(createReconcileAcceptedResult(7, ["action-1"]), {
    kind: "accepted",
    version: 7,
    accepted: ["action-1"],
  });
  assert.deepEqual(createReconcileSnapshotResult({
    snapshot: {
      version: 9,
      state: {
        count: 2,
      },
    },
    accepted: ["action-1"],
    rejected: [
      {
        id: "action-2",
        reason: "conflict",
      },
    ],
  }), {
    kind: "snapshot",
    snapshot: {
      version: 9,
      state: {
        count: 2,
      },
    },
    accepted: ["action-1"],
    rejected: [
      {
        id: "action-2",
        reason: "conflict",
      },
    ],
  });

  assert.equal(getReconcileResult({ kind: "accepted", version: 1, accepted: [] }).kind, "accepted");
  assert.equal(getReconcileResult({ kind: "snapshot", snapshot: { version: 1 }, accepted: [], rejected: [] }).kind, "snapshot");
});

test("validates reconcile requests fail-closed", () => {
  assert.throws(() => createPendingMutation({
    id: "",
    baseVersion: 0,
    action: {
      type: "increment",
    },
    createdAt: 1,
  }), MutationError);
  assert.throws(() => createReconcileRequest({
    clientId: "client-1",
    lastSeenVersion: 0,
    actions: [
      {
        id: "same",
        baseVersion: 0,
        action: {
          type: "increment",
        },
        createdAt: 1,
      },
      {
        id: "same",
        baseVersion: 0,
        action: {
          type: "increment",
        },
        createdAt: 2,
      },
    ],
  }), MutationError);
  assert.throws(() => getReconcileRequest({ clientId: "client-1", lastSeenVersion: 0, actions: null }), MutationError);
  assert.throws(() => getReconcileResult({ kind: "accepted", version: 1, accepted: [null] }), MutationError);
});

test("checks whether pending mutations are replayable against a version", () => {
  const pending = createPendingMutation({
    id: "action-1",
    baseVersion: 2,
    action: {
      type: "increment",
    },
    createdAt: 1,
  });

  assert.equal(shouldReplayMutation(pending, 2), true);
  assert.equal(shouldReplayMutation(pending, 3), true);
  assert.equal(shouldReplayMutation(pending, 1), false);
});

test("resolves public package subpaths", async () => {
  const root = await import("@ts-zero/mutation");
  const apply = await import("@ts-zero/mutation/apply");
  const protocol = await import("@ts-zero/mutation/protocol");
  const reconcile = await import("@ts-zero/mutation/reconcile");
  const errors = await import("@ts-zero/mutation/errors");
  const types = await import("@ts-zero/mutation/types");

  assert.equal(root.applyMutationResult, applyMutationResult);
  assert.equal(apply.applyMutationResult, applyMutationResultFromSubpath);
  assert.equal(protocol.createMutationRequest, createMutationRequestFromSubpath);
  assert.equal(reconcile.createReconcileRequest, createReconcileRequestFromSubpath);
  assert.equal(typeof errors.MutationError, "function");
  assert.deepEqual(Object.keys(types), []);
});

test("public barrel remains a re-export-only module for tree-checking", () => {
  const source = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");

  assert.match(source, /^export /m);
  assert.doesNotMatch(source, /function\s+/);
  assert.doesNotMatch(source, /const\s+/);
  assert.doesNotMatch(source, /let\s+/);
  assert.doesNotMatch(source, /class\s+/);
});
