# @ts-zero/mutation

Zero-dependency helpers for versioned web mutations.

## Goal

`@ts-zero/mutation` defines a small JSON-friendly convention for client/server mutations:

- the client sends its current version and an explicit action;
- the server applies the action if valid;
- the server returns a compact action acknowledgement when the client was current;
- the server returns a snapshot when the client must resynchronize.

It is not RPC. It does not hide HTTP, does not call server functions from the client, and does not require TypeScript on the other side of the wire.

## Protocol

Request body shape:

```json
{
  "version": 2,
  "action": {
    "type": "createTodo",
    "payload": {
      "title": "Ship"
    }
  }
}
```

Compact response:

```json
{
  "kind": "action",
  "previousVersion": 2,
  "version": 3,
  "action": {
    "type": "createTodo",
    "payload": {
      "id": "todo-1",
      "title": "Ship",
      "completed": false
    }
  }
}
```

Resync response:

```json
{
  "kind": "snapshot",
  "snapshot": {
    "version": 7,
    "state": {}
  }
}
```

## API

```ts
import {
  applyMutationResult,
  createActionResult,
  createMutationRequest,
  createSnapshotResult,
  getMutationRequest,
  isVersionCurrent,
} from "@ts-zero/mutation";
```

The helpers work with any store-shaped object. They do not import `@ts-zero/store` at runtime.

## Offline Reconciliation

`@ts-zero/mutation/reconcile` provides a small contract for offline action queues:

- clients persist pending actions with an id, base version, action and timestamp;
- clients replay those actions when connectivity returns;
- servers can acknowledge accepted actions or return a snapshot with explicit rejections;
- conflict policy stays in the application/domain.

Pending action:

```json
{
  "id": "action-1",
  "baseVersion": 12,
  "action": {
    "type": "increment",
    "payload": 1
  },
  "createdAt": 1710000000000
}
```

Replay request:

```json
{
  "clientId": "client-1",
  "lastSeenVersion": 12,
  "actions": []
}
```

Accepted result:

```json
{
  "kind": "accepted",
  "version": 15,
  "accepted": ["action-1"]
}
```

Snapshot fallback with rejections:

```json
{
  "kind": "snapshot",
  "snapshot": {
    "version": 18,
    "state": {}
  },
  "accepted": ["action-1"],
  "rejected": [
    {
      "id": "action-2",
      "reason": "conflict"
    }
  ]
}
```

This is not a CRDT and does not promise automatic merging. Commutative actions, such as counter increments, can replay naturally. Domain-sensitive actions must define their own conflict rules.

## Web Standards

This package intentionally stays close to the platform:

- JSON-compatible request and response bodies;
- explicit action names;
- no hidden transport;
- no generated client;
- no RPC illusion;
- can be tested with `curl`;
- can be served by any Web Standard `Request` / `Response` handler.

## Tree-Shaking Top Tier

- ESM only.
- `sideEffects: false`.
- `index.ts` is only a re-export file.
- Focused subpaths: `/apply`, `/protocol`, `/errors`, `/types`.
- Reconciliation helpers live in `/reconcile` and are not pulled in unless imported.
- `types.ts` is runtime-empty.

Prefer focused imports in bundle-sensitive code:

```ts
import { applyMutationResult } from "@ts-zero/mutation/apply";
import { createMutationRequest } from "@ts-zero/mutation/protocol";
import { createReconcileRequest } from "@ts-zero/mutation/reconcile";
```

## Non-Goals

- No HTTP server.
- No fetch wrapper.
- No router.
- No RPC.
- No subscriptions.
- No optimistic update policy.
- No automatic offline merge policy.
- No CRDT.
- No schema validation system.
- No dependency on `@ts-zero/store`.
