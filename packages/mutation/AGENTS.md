# @ts-zero/mutation Agent Guide

Versioned mutation protocol helpers for ts-zero.

## Non-Negotiables

- Do not add runtime dependencies.
- Keep the package web-standard and transport-agnostic.
- Do not add RPC semantics or generated clients.
- Keep `index.ts` re-export-only.
- Preserve focused subpaths: `./apply`, `./protocol`, `./errors`, and `./types`.
- Do not import `@ts-zero/store` at runtime; accept store-shaped objects.

## Design Rules

- Prefer terms like mutation, action, version, snapshot, result.
- Keep payloads plain and inspectable over JSON.
- Treat snapshot fallback as resynchronization, not the normal path.
- Do not assume Solid, React, DOM, Node, Bun, serverless providers, or native hosts.
- Keep helpers small enough to be replaced by hand-written `fetch` code.

## Tree-Shaking Rules

- Put runtime behavior in focused files.
- Keep `types.ts` runtime-empty.
- Keep top-level modules free of global reads and side effects.
- Add subpath tests for every public entry.

## Test Requirements

Keep tests for:

- request creation;
- compact action result creation;
- snapshot result creation;
- malformed request/result rejection;
- action result application;
- snapshot hydration;
- stale local version failure;
- public subpath resolution;
- tree-checking source assertions.
