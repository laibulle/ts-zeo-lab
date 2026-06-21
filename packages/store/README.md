# @ts-zero/store

Zero-dependency immutable state engine for server, client, edge, mobile bridge, and LiveView-like runtimes.

The v0 scope is intentionally small: deterministic transitions, versioned snapshots, replace patches, hydration, optimistic version guards, selector subscriptions, and optional deep freeze.

## Install

```sh
npm install @ts-zero/store
```

## Usage

```ts
import { createStore } from "@ts-zero/store/create";

const store = createStore({
  state: { todos: [] as { id: string; text: string; done: boolean }[] },
  context: {
    id: () => crypto.randomUUID(),
  },
  transitions: {
    addTodo: (state, text: string, context) => ({
      ...state,
      todos: state.todos.concat({ id: context.id(), text, done: false }),
    }),
    toggleTodo: (state, id: string) => ({
      ...state,
      todos: state.todos.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo)),
    }),
  },
});

store.subscribe(
  (state) => state.todos.length,
  (nextCount) => {
    console.log(nextCount);
  },
);

const result = store.dispatch("addTodo", "Ship v0");

if (result.ok && !result.noop) {
  sendPatchToClient(result.patch);
}
```

## Contract

- State is immutable by convention. Transitions must return the next state instead of mutating the current state.
- Dispatch is synchronous and deterministic for the same state, payload, and context.
- Versions are non-negative safe integers.
- `baseVersion` detects stale client actions without throwing.
- `snapshot()` returns `{ version, state }`.
- `hydrate(snapshot)` replaces local state and version.
- `applyPatch(patch)` currently supports only `{ kind: "replace" }`.
- `subscribe(selector, listener)` only calls the listener when the selected value changes.
- `freeze: true` recursively freezes initial, hydrated, patched, and dispatched states.

## LiveView And Hybrid UI

The store is designed as a small authoritative state kernel. A server can dispatch transitions, emit patches, hydrate clients, and reject stale actions by `baseVersion`. A client, mobile SDUI runtime, or fine-grained UI renderer can subscribe to selectors and re-render only the affected surface.

This package does not include networking, React bindings, persistence, CRDTs, schema validation, or transport diffing. Those belong in separate optional packages.

## Tree-Shaking

This package is optimized for top-tier tree-shaking:

- ESM only.
- `sideEffects: false`.
- `index.ts` is only a re-export file.
- focused subpaths: `@ts-zero/store/create`, `@ts-zero/store/freeze`, `@ts-zero/store/snapshot`, `@ts-zero/store/types`.
- no global registries, implicit runtime detection, monkey patching, or top-level initialization.

Prefer focused imports in bundle-sensitive code:

```ts
import { createStore } from "@ts-zero/store/create";
```

## Security

- No runtime dependencies.
- No eval, dynamic code generation, proxy magic, global mutation, filesystem access, or network access.
- Unknown transitions and malformed snapshots/actions fail closed with `StoreError`.
- Patch application requires exact version matching.
- Optional `freeze: true` helps catch accidental mutation during development and in high-integrity runtimes.

## Non-Goals

- No mutable reducers.
- No Immer-style proxy layer.
- No React-specific API.
- No transport protocol.
- No CRDT conflict resolution.
- No JSON Patch or structural diff in v0.
- No general-purpose event bus.
