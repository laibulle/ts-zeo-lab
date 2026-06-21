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
