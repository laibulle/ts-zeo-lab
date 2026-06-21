# ts-zero Kits Agent Guide

Packages in this directory are composite packages published under `@ts-zero-kit/*`.

## Contract

- Kits may depend on `@ts-zero/*` primitives.
- Kits must not add third-party runtime dependencies.
- Kits must stay tree-shakable: use focused primitive subpaths and avoid broad barrels when a subpath exists.
- Kits must have a `README.md`, `AGENTS.md`, tests, and `sideEffects: false`.
- Kits should provide ergonomic defaults without hiding important runtime choices such as persistence, transport, auth, retries, or conflict strategy.

## Boundaries

- Do not move primitive behavior into kits when it belongs in a small standalone `@ts-zero/*` package.
- Do not make primitives depend on kits.
- Do not make primitives depend on other primitives unless the package has been intentionally reclassified or a design decision updates the primitive contract.
- Prefer dependency injection for environment-specific capabilities: storage, clocks, IDs, crypto, network, and scheduling.

## Expected Kit Shape

Every kit should document:

- which primitives it composes;
- which runtime environments it targets;
- which defaults are provided;
- which extension points are required for production use;
- how it preserves tree-shaking.
