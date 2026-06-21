# @ts-zero/runtime Agent Guide

Cross-surface application runtime primitives for ts-zero.

## Non-Negotiables

- Do not add runtime dependencies.
- Keep `index.ts` as a re-export-only module.
- Preserve focused subpaths: `./channel`, `./runtime`, `./handles`, `./serializable`, `./errors`, and `./types`.
- Keep runtime payloads serializable and fail-closed.
- Do not add UI, DOM, Swift, Kotlin, Node, Bun, or JavaScriptCore assumptions to this package.

## Design Rules

- Use `HostChannel` terminology for runtime/surface transport.
- Keep application logic portable across web, native, server, and tests.
- Use opaque `ResourceHandle` values for resources such as frames, files, audio buffers, images, database cursors, or shared native objects.
- Keep capabilities open-ended as `capability + operation`; typed capability layers belong in separate packages.
- Prefer explicit errors over silent drops for unknown responses or malformed messages.

## Tree-Shaking Rules

- `index.ts` must only re-export.
- Put new behavior in focused files and expose focused package subpaths.
- Keep `types.ts` runtime-empty.
- Do not make the memory test channel required by the core runtime.

## Test Requirements

Keep tests for:

- request/response resolution;
- host and runtime events;
- failed responses and runtime destruction;
- serializable validation and cycle rejection;
- resource handle validation;
- malformed input failures;
- public package subpath resolution;
- tree-checking source assertions.
