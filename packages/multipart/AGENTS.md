# @ts-zero/multipart Agent Guide

This package provides a strict in-memory `multipart/form-data` encoder with zero runtime dependencies.

## Non-Negotiables

- Do not add runtime dependencies.
- Keep `index.ts` as a re-export-only module.
- Preserve focused subpaths: `./encode`, `./parts`, and `./boundary`.
- Do not add filesystem, stream, MIME database, or `FormData` polyfill behavior without an explicit design decision.
- Prefer a small auditable core over historical `form-data` compatibility.

## Security Rules

- Boundary generation must use `globalThis.crypto.getRandomValues`.
- Never fall back to `Math.random`.
- Reject invalid boundaries.
- Reject control characters, quote, and backslash injection in header parameters.
- Reject part bodies that contain the active boundary marker.
- Reject malformed `Content-Type` values.
- Do not sniff MIME types or infer them from filenames.

## Tree-Checking Rules

- Importing `@ts-zero/multipart/parts` must not pull random boundary generation or the encoder.
- Importing `@ts-zero/multipart/boundary` must not pull multipart encoding.
- Shared helpers must stay small and side-effect free.
- Do not add top-level registries, caches, monkey patches, runtime auto-detection, or mutable global state.

## Test Requirements

Keep tests for:

- exact deterministic multipart output;
- default file content type;
- injected deterministic boundary generation;
- invalid boundaries;
- CRLF/header injection attempts;
- invalid byte values;
- fail-closed crypto behavior;
- public package subpath resolution;
- tree-checking source assertions.
