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
- `types.ts` is runtime-empty.

Prefer focused imports in bundle-sensitive code:

```ts
import { applyMutationResult } from "@ts-zero/mutation/apply";
import { createMutationRequest } from "@ts-zero/mutation/protocol";
```

## Non-Goals

- No HTTP server.
- No fetch wrapper.
- No router.
- No RPC.
- No subscriptions.
- No optimistic update policy.
- No schema validation system.
- No dependency on `@ts-zero/store`.
