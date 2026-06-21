export type MutationVersion = number;

export interface MutationAction<Payload = unknown> {
  readonly type: string;
  readonly payload?: Payload;
}

export interface MutationRequest<Payload = unknown> {
  readonly version: MutationVersion;
  readonly action: MutationAction<Payload>;
}

export interface MutationActionResult<Payload = unknown> {
  readonly kind: "action";
  readonly previousVersion: MutationVersion;
  readonly version: MutationVersion;
  readonly action: MutationAction<Payload>;
}

export interface MutationSnapshotResult<Snapshot = unknown> {
  readonly kind: "snapshot";
  readonly snapshot: Snapshot;
}

export type MutationResult<Snapshot = unknown, Payload = unknown> =
  | MutationActionResult<Payload>
  | MutationSnapshotResult<Snapshot>;

export interface MutationStore<Snapshot, Payload = unknown> {
  readonly version: () => MutationVersion;
  readonly snapshot: () => Snapshot;
  readonly dispatch: (type: string, payload?: Payload) => unknown;
  readonly hydrate: (snapshot: Snapshot) => Snapshot;
}

export interface PendingMutation<Payload = unknown> {
  readonly id: string;
  readonly baseVersion: MutationVersion;
  readonly action: MutationAction<Payload>;
  readonly createdAt: number;
}

export interface ReconcileRequest<Payload = unknown> {
  readonly clientId: string;
  readonly lastSeenVersion: MutationVersion;
  readonly actions: readonly PendingMutation<Payload>[];
}

export interface RejectedMutation {
  readonly id: string;
  readonly reason: string;
}

export interface ReconcileAcceptedResult {
  readonly kind: "accepted";
  readonly version: MutationVersion;
  readonly accepted: readonly string[];
}

export interface ReconcileSnapshotResult<Snapshot = unknown> {
  readonly kind: "snapshot";
  readonly snapshot: Snapshot;
  readonly accepted: readonly string[];
  readonly rejected: readonly RejectedMutation[];
}

export type ReconcileResult<Snapshot = unknown> =
  | ReconcileAcceptedResult
  | ReconcileSnapshotResult<Snapshot>;
