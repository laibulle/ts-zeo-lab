# @ts-zero/native-runtime Agent Guide

Native host runtime primitives for ts-zero.

## Non-Negotiables

- Do not add runtime dependencies.
- Do not call this layer a bridge in public API names.
- Keep `index.ts` as a re-export-only module.
- Preserve focused subpaths: `./channel`, `./runtime`, `./handles`, `./serializable`, `./errors`, and `./types`.
- Keep runtime payloads serializable and fail-closed.

## Design Rules

- Use `HostChannel` terminology for JS/native transport.
- Keep JavaScript responsible for orchestration, not heavy binary transfer.
- Use opaque `NativeHandle` values for native resources such as frames, files, audio buffers, images, database cursors, or shared native objects.
- Do not add UI concepts to this package.
- Do not assume DOM, Node APIs, React Native, Expo, Swift, Kotlin, timers, crypto, or storage exist.
- Keep capabilities open-ended as `capability + operation`; package-specific typed capability layers can be added separately.
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
- native handle validation;
- malformed input failures;
- public package subpath resolution;
- tree-checking source assertions.
