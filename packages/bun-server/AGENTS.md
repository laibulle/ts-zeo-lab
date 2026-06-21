# @ts-zero/bun-server Agent Guide

Bun-specific adapter for ts-zero Web Standard handlers.

## Non-Negotiables

- Do not add runtime dependencies.
- Do not import Node APIs.
- Keep Bun-specific behavior isolated in this package.
- Do not make `@ts-zero/http` depend on this package.
- Preserve focused subpaths: `./serve` and `./types`.

## Runtime Rules

- Delegate to `Bun.serve`.
- Fail closed when `Bun.serve` is unavailable.
- Keep filesystem, static files, sessions, cache, and WebSocket behavior out of v0.

## Test Requirements

Keep tests for:

- delegation to a mocked `Bun.serve`;
- fail-closed behavior outside Bun;
- public package subpath resolution.
