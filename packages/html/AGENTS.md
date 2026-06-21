# @ts-zero/html Agent Guide

This package is the browser HTML UI runtime for `@ts-zero`. It should make real HTML ergonomic without becoming the portable UI model for every client.

## Non-Negotiables

- Keep runtime dependencies at zero.
- Keep `src/index.ts` as a re-export-only barrel.
- Do not add compilers, template parsers, virtual DOM, schedulers, CSS engines, routers, fetch clients, storage, React compatibility, or mobile abstractions in this package.
- Keep JSX support limited to the zero-dependency automatic runtime helpers in `jsx-runtime` and `jsx-dev-runtime`.
- Do not import `@ts-zero/store` at runtime. Store compatibility must stay structural.
- Do not expose APIs that accept raw HTML strings.

## v0 Scope

- `h`
- `text`
- `fragment`
- `mount`
- `clear`
- `select`
- `list`
- `action`
- `formAction`
- optional `jsx-runtime`
- optional `jsx-dev-runtime`

Everything else belongs in a separate optional package unless the design is explicitly changed.

## Security Rules

- Reject `innerHTML`, `outerHTML`, and `insertAdjacentHTML`.
- Convert primitive children to text nodes.
- Validate tag names, event names, dataset names, and style names.
- Event handlers must be explicit functions.
- Do not install global listeners or mutate browser globals.
- Do not swallow store, renderer, or listener exceptions.

## Tree-Shaking Rules

- Preserve focused subpaths.
- Keep modules split by responsibility: elements, mount, bindings, actions, errors, types.
- Do not make `elements` import bindings or actions.
- Do not make `actions` import elements.
- JSX runtime may import `elements`, but it must not import bindings, actions, store, router, or runtime-specific APIs.
- Tests must verify package subpaths and barrel-only re-export behavior.

## Quality Gate

Run from the repository root:

```sh
npm run check
```

HTML tests must cover safe element creation, rejected unsafe inputs, mount/clear, store bindings, list key validation, DOM-to-store actions, form actions, JSX runtime helpers, subpath imports, and tree-checking.
