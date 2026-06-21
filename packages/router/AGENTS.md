# @ts-zero/router Agent Guide

Explicit router builder for ts-zero.

## Non-Negotiables

- Do not add runtime dependencies.
- Do not add decorators.
- Do not add filesystem routing to this package.
- Keep `index.ts` as a re-export-only module.
- Keep the manifest public, serializable, and handler-free.
- Preserve focused subpaths: `./builder`, `./path`, `./errors`, and `./types`.

## Design Rules

- Prefer Phoenix-like clarity over framework magic.
- `defineRoutes` is the source of truth for v0.
- File-based routing, React adapters, and decorators belong in separate optional packages if they ever exist.
- Keep route params null-prototype objects.
- Keep reverse routing strict: missing params should throw.
- Reject duplicate route names, duplicate `method + path` pairs, and duplicate params in the same path.
- Public `routes` and `manifest()` snapshots must remain immutable and must not expose internal matching fields.

## Test Requirements

Keep tests for:

- named routes and manifest output;
- nested scopes;
- pipelines;
- matching and decoded params;
- reverse routing;
- duplicate/invalid definitions;
- malformed request paths;
- public package subpath resolution;
- tree-checking source assertions.
