# @ts-zero/http Agent Guide

This package provides the Web Standard HTTP foundation for the future framework.

## Non-Negotiables

- Do not add runtime dependencies.
- Keep the core contract `Request -> Promise<Response>`.
- Keep `index.ts` as a re-export-only module.
- Preserve focused subpaths: `./app`, `./responses`, `./errors`, and `./types`.
- Do not add Node, Vercel, filesystem routing, JSX, sessions, or WebSocket behavior to this core package without an explicit design decision.

## Runtime Rules

- Use Web Platform APIs first.
- Do not mutate global state or monkey patch platform objects.
- Keep route params null-prototype objects.
- Do not leak non-HTTP error messages by default.
- Keep body parsing out of v0; callers can read `context.request`.

## Tree-Checking Rules

- Importing `@ts-zero/http/responses` must not pull the router or app runtime.
- Importing `@ts-zero/http/errors` must remain tiny and side-effect free.
- Shared helpers must stay small and auditable.
- Do not add top-level caches, registries, runtime auto-detection, or mutable global state.

## Test Requirements

Keep tests for:

- Web Standard request/response routing;
- decoded route params;
- middleware ordering;
- async state;
- 404 and 405 behavior;
- custom `notFound` and `onError`;
- `HEAD` body stripping;
- invalid route and path inputs;
- response helpers;
- public package subpath resolution;
- tree-checking source assertions.
