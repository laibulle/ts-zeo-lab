import { fail } from "./errors.js";
import type {
  MutationAction,
  MutationVersion,
  PendingMutation,
  ReconcileAcceptedResult,
  ReconcileRequest,
  ReconcileResult,
  ReconcileSnapshotResult,
  RejectedMutation,
} from "./types.js";

export function createPendingMutation<Payload>({
  action,
  baseVersion,
  createdAt,
  id,
}: PendingMutation<Payload>): PendingMutation<Payload> {
  assertIdentifier(id, "pending mutation id");
  assertVersion(baseVersion, "pending baseVersion");
  assertTimestamp(createdAt, "pending createdAt");
  validateAction(action);

  return {
    id,
    baseVersion,
    action,
    createdAt,
  };
}

export function createReconcileRequest<Payload>({
  actions,
  clientId,
  lastSeenVersion,
}: ReconcileRequest<Payload>): ReconcileRequest<Payload> {
  assertIdentifier(clientId, "client id");
  assertVersion(lastSeenVersion, "last seen version");
  validatePendingMutations(actions);

  return {
    clientId,
    lastSeenVersion,
    actions,
  };
}

export function createReconcileAcceptedResult(
  version: MutationVersion,
  accepted: readonly string[],
): ReconcileAcceptedResult {
  assertVersion(version, "accepted version");
  validateIdentifiers(accepted, "accepted mutation id");

  return {
    kind: "accepted",
    version,
    accepted,
  };
}

export function createReconcileSnapshotResult<Snapshot>({
  accepted,
  rejected,
  snapshot,
}: {
  readonly snapshot: Snapshot;
  readonly accepted: readonly string[];
  readonly rejected: readonly RejectedMutation[];
}): ReconcileSnapshotResult<Snapshot> {
  validateIdentifiers(accepted, "accepted mutation id");
  validateRejectedMutations(rejected);

  return {
    kind: "snapshot",
    snapshot,
    accepted,
    rejected,
  };
}

export function getReconcileRequest(value: unknown): ReconcileRequest {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail("Expected reconcile request object");
  }

  const request = value as Partial<ReconcileRequest>;
  assertIdentifier(request.clientId, "client id");
  assertVersion(request.lastSeenVersion, "last seen version");
  validatePendingMutations(request.actions);

  return request as ReconcileRequest;
}

export function getReconcileResult(value: unknown): ReconcileResult {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail("Expected reconcile result object");
  }

  const result = value as Partial<ReconcileResult>;

  if (result.kind === "accepted") {
    assertVersion(result.version, "accepted version");
    validateIdentifiers(result.accepted, "accepted mutation id");
    return result as ReconcileAcceptedResult;
  }

  if (result.kind === "snapshot" && "snapshot" in result) {
    validateIdentifiers(result.accepted, "accepted mutation id");
    validateRejectedMutations(result.rejected);
    return result as ReconcileSnapshotResult;
  }

  fail("Expected reconcile result kind to be accepted or snapshot");
}

export function shouldReplayMutation(
  pending: PendingMutation,
  currentVersion: MutationVersion,
): boolean {
  assertVersion(currentVersion, "current version");
  validatePendingMutation(pending);
  return pending.baseVersion <= currentVersion;
}

function validatePendingMutations(value: unknown): asserts value is readonly PendingMutation[] {
  if (!Array.isArray(value)) {
    fail("Expected pending mutation actions array");
  }

  const ids = new Set<string>();

  for (const pending of value) {
    validatePendingMutation(pending);

    if (ids.has(pending.id)) {
      fail("Expected pending mutation ids to be unique");
    }

    ids.add(pending.id);
  }
}

function validatePendingMutation(value: unknown): asserts value is PendingMutation {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail("Expected pending mutation object");
  }

  const pending = value as Partial<PendingMutation>;
  assertIdentifier(pending.id, "pending mutation id");
  assertVersion(pending.baseVersion, "pending baseVersion");
  assertTimestamp(pending.createdAt, "pending createdAt");
  validateAction(pending.action);
}

function validateRejectedMutations(value: unknown): asserts value is readonly RejectedMutation[] {
  if (!Array.isArray(value)) {
    fail("Expected rejected mutations array");
  }

  for (const rejected of value) {
    if (rejected === null || typeof rejected !== "object" || Array.isArray(rejected)) {
      fail("Expected rejected mutation object");
    }

    assertIdentifier((rejected as Partial<RejectedMutation>).id, "rejected mutation id");

    if (typeof (rejected as Partial<RejectedMutation>).reason !== "string" || (rejected as Partial<RejectedMutation>).reason?.length === 0) {
      fail("Expected rejected mutation reason to be a non-empty string");
    }
  }
}

function validateIdentifiers(value: unknown, label: string): asserts value is readonly string[] {
  if (!Array.isArray(value)) {
    fail(`Expected ${label}s array`);
  }

  for (const id of value) {
    assertIdentifier(id, label);
  }
}

function validateAction(action: unknown): asserts action is MutationAction {
  if (action === null || typeof action !== "object" || Array.isArray(action)) {
    fail("Expected mutation action object");
  }

  if (typeof (action as Partial<MutationAction>).type !== "string" || (action as Partial<MutationAction>).type?.length === 0) {
    fail("Expected mutation action type to be a non-empty string");
  }
}

function assertIdentifier(id: unknown, label: string): asserts id is string {
  if (typeof id !== "string" || id.length === 0) {
    fail(`Expected ${label} to be a non-empty string`);
  }
}

function assertTimestamp(timestamp: unknown, label: string): asserts timestamp is number {
  if (typeof timestamp !== "number" || !Number.isSafeInteger(timestamp) || timestamp < 0) {
    fail(`Expected ${label} to be a non-negative safe integer`);
  }
}

function assertVersion(version: unknown, label: string): asserts version is MutationVersion {
  if (typeof version !== "number" || !Number.isSafeInteger(version) || version < 0) {
    fail(`Expected ${label} to be a non-negative safe integer`);
  }
}
