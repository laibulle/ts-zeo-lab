# @ts-zero/node-server Agent Guide

Node-specific HTTP adapter for ts-zero Web Standard handlers.

## Non-Negotiables

- Do not add runtime dependencies.
- Keep Node imports isolated in this package.
- Do not make `@ts-zero/http` depend on this package.
- Keep the public contract centered on Web Standard `Request` / `Response`.
- Preserve focused subpaths: `./serve` and `./types`.

## Runtime Rules

- Enforce a request body limit.
- Do not leak internal errors by default.
- Stream `Response.body` to Node responses.
- Keep filesystem, compression, TLS, static files, and session behavior out of v0.

## Test Requirements

Keep tests for:

- real Node HTTP serving;
- request body forwarding;
- body limit rejection;
- custom `onError`;
- public package subpath resolution.
