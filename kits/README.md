# ts-zero kits

`kits/` contains composite packages published under the `@ts-zero-kit/*` namespace.

Kits assemble `@ts-zero/*` primitives into higher-level product and framework building blocks. They may depend on internal primitives, but they must not add third-party runtime dependencies.

## Naming

- `packages/*` -> primitive packages published as `@ts-zero/*`
- `kits/*` -> composite packages published as `@ts-zero-kit/*`

Examples:

- `@ts-zero-kit/sync`
- `@ts-zero-kit/web`
- `@ts-zero-kit/live`

## Rules

- Zero third-party runtime dependencies.
- Internal `@ts-zero/*` runtime dependencies are allowed when they materially improve ergonomics or safety.
- Keep public APIs explicit and tree-shakable.
- Import primitive subpaths when possible, for example `@ts-zero/uuid/v7`.
- Do not hide transport, persistence, or runtime assumptions behind magic defaults.
- Document every internal primitive dependency and why it exists.
