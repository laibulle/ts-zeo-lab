# ts-zero Agent Guide

This monorepo publishes TypeScript libraries under the `@ts-zero` namespace.

## Non-Negotiables

- Runtime packages must have zero dependencies.
- Runtime packages must be extremely optimized for tree-shaking.
- Runtime packages must pass strict tree-checking review: unused exports must remain removable by modern bundlers.
- Prefer small, auditable TypeScript over clever abstractions.
- Treat standards conformance, security, and performance as release gates.
- Do not add dependencies, code generation, native addons, or WASM without an explicit design decision.
- If a benchmark compares against an external package, install it outside the repository or use an already supplied path.

## Package Requirements

Every package must include:

- `README.md` with API, conformance notes, security notes, and benchmark instructions when performance matters.
- `AGENTS.md` with package-specific implementation rules.
- Tests for standards fixtures, invalid input, buffer offsets, and security-sensitive failure modes.
- A package manifest with an empty runtime `dependencies` object.
- A package manifest with `sideEffects: false` unless a package has a documented reason not to.

## Quality Bar

- Conformance: cite the relevant standard or upstream contract in docs and tests.
- Security: fail closed on malformed input, unavailable crypto, counter overflow, and unsafe ranges.
- Performance: benchmark hot paths before and after optimization; keep comparison dependencies outside this repo.
- Tree-shaking: keep modules ESM-first, avoid top-level side effects beyond immutable constants, and design exports so consumers can import only what they use.
- Tree-checking: when adding an API, ask whether importing one symbol can accidentally retain unrelated algorithms, lookup tables, state, or runtime branches.
- Subpath exports: add focused subpaths when they let consumers avoid unrelated algorithms or state, for example format-only helpers separate from generators.
- Top-tier bundle design: split internal modules when it materially improves dead-code elimination, but do not fragment code in ways that harm auditability.
- Avoid namespace-oriented public examples for bundle-sensitive usage; prefer named imports in docs and tests.
- Portability: target modern runtimes with Web Platform APIs where possible, especially `globalThis.crypto`.

## Verification

Before handing off changes:

```sh
npm run check
```

For performance-sensitive UUID changes:

```sh
npm run bench:uuid:compare
```

For query string changes, keep the contract strict: reject ambiguous structures, preserve null-prototype parsed objects, and verify `./parse` and `./stringify` remain independently tree-shakable.

For multipart changes, keep the contract in-memory and strict: no filesystem, no streams, no MIME database, no weak random fallback, and verify `./parts`, `./encode`, and `./boundary` remain independently tree-shakable.

For HTTP changes, keep the core runtime-agnostic: Web Standard `Request` / `Response`, no Node-specific APIs, no filesystem routing, no body parsing magic, and verify `./app`, `./responses`, and `./errors` remain independently tree-shakable.

For runtime server adapters, keep Node and Bun isolated in separate packages. `@ts-zero/node-server` may import `node:*`; `@ts-zero/bun-server` must not. Neither adapter should leak back into `@ts-zero/http`.

For router changes, keep `defineRoutes` explicit and decorator-free. File-based routing, React adapters, and code generation belong in separate optional packages, not in `@ts-zero/router`.
