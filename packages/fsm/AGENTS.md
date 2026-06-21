# @ts-zero/fsm Agent Guide

Finite state machine primitives for ts-zero.

## Non-Negotiables

- Do not add runtime dependencies.
- Keep `index.ts` as a re-export-only module.
- Keep the v0 core finite-state only: no hidden scheduler, no implicit async runtime, no decorators.
- Preserve focused subpaths: `./assign`, `./machine`, `./service`, `./errors`, `./types`, and `./xstate`.
- Keep public snapshots immutable.

## Design Rules

- Prefer explicit machine config over framework magic.
- Keep transitions deterministic: same snapshot + event must produce the same result when guards/actions are pure.
- Keep context updates immutable; use `assign` for the standard path.
- Keep the supported config shape pasteable into the XState/Stately visualizer for flat machines.
- Preserve `cond` as an alias for XState-style guards.
- Add statechart features only as explicit future work or separate focused modules.
- Do not make `service` required for users that only need pure transition logic.
- Keep runtime validation fail-closed for malformed configs, events, snapshots, and targets.

## Tree-Shaking Rules

- `index.ts` must only re-export.
- Put new behavior in focused files and expose focused package subpaths.
- Avoid top-level work outside constants and type-free exports.
- Do not create imports from `service` back into `machine`; pure transition users must not retain service code.
- Keep `types.ts` runtime-empty.

## Test Requirements

Keep tests for:

- deterministic transitions;
- guards and guarded transition arrays;
- action and `assign` context updates;
- service subscription/start/stop behavior;
- XState-compatible config helpers and `cond` aliases;
- malformed config/event/snapshot failures;
- public package subpath resolution;
- tree-checking source assertions.
