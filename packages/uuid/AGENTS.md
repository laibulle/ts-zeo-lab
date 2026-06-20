# @ts-zero/uuid Agent Guide

This package implements UUID utilities with zero runtime dependencies.
It must remain extremely optimized for tree-shaking.
Every change must also pass tree-checking review: unused algorithms should stay removable from consumer bundles.

## Scope

The package tracks the RFC9562 UUID model and the common public contract of the `uuid` npm package:

- Generate UUID versions `1`, `3`, `4`, `5`, `6`, and `7`.
- Validate UUID version `8`, but do not add a `v8()` generator unless a vendor-specific layout is explicitly designed.
- Keep `parse`, `stringify`, `validate`, `version`, `NIL`, `MAX`, and namespace constants compatible with the reference contract.

## Security Rules

- Use only `globalThis.crypto.getRandomValues` for entropy.
- Never fall back to `Math.random`.
- Throw when secure randomness is unavailable.
- Do not expose MAC addresses by default; generated v1/v6 node IDs must be random and multicast-marked.
- Counter or timestamp rollover must fail closed instead of knowingly producing duplicates or non-monotone values.
- Avoid accepting malformed UUIDs, invalid variant bits, invalid version bits, negative times, or out-of-range sequence values.

## Performance Rules

- Preserve ESM named exports and avoid export patterns that force whole-module retention.
- Keep `sideEffects: false` true in `package.json`.
- Maintain subpath exports for independently tree-shakable surfaces, starting with `@ts-zero/uuid/format`.
- Keep `index.ts` as a re-export facade only. Implementation belongs in focused modules.
- Maintain version subpaths such as `@ts-zero/uuid/v4` and `@ts-zero/uuid/v7`.
- Avoid top-level side effects except immutable constants, lookup tables, and lazy-safe state needed by generators.
- Keep unrelated algorithms separable enough for bundlers to drop them when their exports are unused.
- Watch for shared helpers that accidentally retain MD5, SHA-1, crypto random generation, timestamp state, or namespace tables from unrelated imports.
- Prefer local helper placement or internal module splits when that improves dead-code elimination without obscuring security review.
- Examples and docs should prefer named imports over namespace imports.
- Preserve buffer-writing overloads for hot paths.
- Benchmark deterministic and crypto-backed generation separately.
- Benchmark `parse`, `stringify`, `validate`, and `version` as standalone operations.
- Keep reference comparisons out of package dependencies; use the temporary install path used by `bench:uuid:compare`.

## Conformance Checks

Tests should cover:

- RFC namespace constants.
- Known deterministic v1/v3/v5/v6/v7 fixtures.
- v1/v6 conversion round-trips.
- NIL, MAX, and v8 validation.
- Uppercase UUID parsing.
- Rejection of malformed UUIDs and invalid byte layouts.
- Buffer offsets and return identity for buffer overloads.
