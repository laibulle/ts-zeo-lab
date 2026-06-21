import { fail } from "./errors.js";
import type {
  MutationAction,
  MutationActionResult,
  MutationRequest,
  MutationResult,
  MutationSnapshotResult,
  MutationVersion,
} from "./types.js";

export function createMutationRequest<Payload>(
  version: MutationVersion,
  type: string,
  payload?: Payload,
): MutationRequest<Payload> {
  assertVersion(version, "request version");
  assertActionType(type);

  return {
    version,
    action: {
      type,
      ...(payload === undefined ? {} : { payload }),
    },
  };
}

export function createActionResult<Payload>(
  previousVersion: MutationVersion,
  version: MutationVersion,
  type: string,
  payload?: Payload,
): MutationActionResult<Payload> {
  assertVersion(previousVersion, "previous version");
  assertVersion(version, "result version");
  assertActionType(type);

  if (version <= previousVersion) {
    fail("Expected result version to be greater than previous version");
  }

  return {
    kind: "action",
    previousVersion,
    version,
    action: {
      type,
      ...(payload === undefined ? {} : { payload }),
    },
  };
}

export function createSnapshotResult<Snapshot>(snapshot: Snapshot): MutationSnapshotResult<Snapshot> {
  return {
    kind: "snapshot",
    snapshot,
  };
}

export function getMutationRequest(value: unknown): MutationRequest {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail("Expected mutation request object");
  }

  const request = value as Partial<MutationRequest>;
  assertVersion(request.version, "request version");
  validateAction(request.action);

  return request as MutationRequest;
}

export function getMutationResult(value: unknown): MutationResult {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail("Expected mutation result object");
  }

  const result = value as Partial<MutationResult>;

  if (result.kind === "action") {
    assertVersion(result.previousVersion, "previous version");
    assertVersion(result.version, "result version");
    validateAction(result.action);
    return result as MutationActionResult;
  }

  if (result.kind === "snapshot" && "snapshot" in result) {
    return result as MutationSnapshotResult;
  }

  fail("Expected mutation result kind to be action or snapshot");
}

export function isVersionCurrent(request: MutationRequest, currentVersion: MutationVersion): boolean {
  assertVersion(currentVersion, "current version");
  return request.version === currentVersion;
}

function validateAction(action: unknown): asserts action is MutationAction {
  if (action === null || typeof action !== "object" || Array.isArray(action)) {
    fail("Expected mutation action object");
  }

  assertActionType((action as Partial<MutationAction>).type);
}

function assertActionType(type: unknown): asserts type is string {
  if (typeof type !== "string" || type.length === 0) {
    fail("Expected mutation action type to be a non-empty string");
  }
}

function assertVersion(version: unknown, label: string): asserts version is MutationVersion {
  if (typeof version !== "number" || !Number.isSafeInteger(version) || version < 0) {
    fail(`Expected ${label} to be a non-negative safe integer`);
  }
}
