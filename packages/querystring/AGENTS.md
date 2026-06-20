# @ts-zero/querystring Agent Guide

This package provides strict query string parsing and stringifying with zero runtime dependencies.

## Non-Negotiables

- Do not add runtime dependencies.
- Keep `index.ts` as a re-export-only module.
- Preserve focused subpaths for tree-shaking: `./parse` and `./stringify`.
- Do not expand toward full `qs` compatibility without explicit design work.
- Prefer rejecting ambiguous structures over guessing.

## Security Rules

- Parsed objects must remain null-prototype objects.
- Never assign `__proto__`, `constructor`, or `prototype` from parsed or stringified paths.
- Keep strict limits for depth and parameter count.
- Invalid percent encoding must throw.
- Mixed scalar/object shapes such as `a=1&a[b]=2` must throw.

## Tree-Checking Rules

- Importing `@ts-zero/querystring/parse` must not pull `stringifyQuery`.
- Importing `@ts-zero/querystring/stringify` must not pull `parseQuery`.
- Shared helpers must stay small and side-effect free.
- Do not add top-level registries, caches, runtime detection, monkey patches, or lazy global state.
- Split new features by responsibility when that improves dead-code elimination.

## Test Requirements

Keep tests for:

- scalar parsing and stringifying;
- arrays with `[]`;
- nested objects;
- percent encoding and invalid encoding;
- prototype pollution attempts;
- depth and parameter limits;
- public package subpath resolution;
- tree-checking source assertions.
