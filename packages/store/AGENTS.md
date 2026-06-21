# @ts-zero/store Agent Guide

This package is the immutable state kernel for authoritative server runtimes, browser clients, mobile SDUI clients, and LiveView-like replication.

## Non-Negotiables

- Keep runtime dependencies at zero.
- Keep the package deterministic and auditable.
- Keep public modules extremely optimized for tree-shaking.
- Keep `src/index.ts` as a re-export-only barrel.
- Do not add React, DOM, Node, Bun, filesystem, networking, persistence, code generation, native addons, or WASM here.

## v0 Scope

- `createStore`
- immutable transitions
- versioned snapshots
- replace patches
- hydration
- version-conflict detection with `baseVersion`
- selector subscriptions for fine-grained rendering
- optional recursive freeze

Everything else belongs in a separate optional package unless the design is explicitly changed.

## Security Rules

- Fail closed on malformed actions, snapshots, patches, versions, selectors, and listeners.
- Do not mutate user state internally except for explicit `deepFreeze` when `freeze: true`.
- Do not swallow listener or transition exceptions.
- Do not add implicit randomness or clocks. Use explicit `context` functions.
- Patch application must require exact source-version matching.

## Tree-Shaking Rules

- Preserve focused subpaths for independent imports.
- Do not add top-level side effects beyond immutable constants.
- Split files by runtime responsibility when it helps dead-code elimination.
- Avoid convenience APIs that import unrelated subsystems.
- Tests must keep the barrel re-export-only and cover subpath imports.

## Quality Gate

Run from the repository root:

```sh
npm run check
```

For store changes, tests must cover dispatch, no-op transitions, conflicts, snapshots, hydration, patch application, selector subscriptions, freeze behavior, invalid inputs, and subpath imports.
