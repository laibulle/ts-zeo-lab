import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createStore, StoreError } from "../dist/index.js";
import { createStore as createStoreFromSubpath } from "../dist/create.js";
import { deepFreeze } from "../dist/freeze.js";
import { createReplacePatch, createSnapshot } from "../dist/snapshot.js";

const transitions = {
  addTodo: (state, text, context) => ({
    ...state,
    todos: state.todos.concat({
      id: context.id(),
      text,
      done: false,
      createdAt: context.now(),
    }),
  }),
  toggle: (state, id) => ({
    ...state,
    todos: state.todos.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo)),
  }),
  noop: (state) => state,
  replaceTitle: (state, title) => ({
    ...state,
    title,
  }),
};

function createTodoStore(options = {}) {
  return createStore({
    state: {
      title: "Inbox",
      todos: [],
    },
    transitions,
    context: {
      id: () => "todo-1",
      now: () => 123,
    },
    ...options,
  });
}

test("dispatch applies a deterministic transition and emits a replace patch", () => {
  const store = createTodoStore();
  const result = store.dispatch("addTodo", "Ship v0");

  assert.equal(result.ok, true);
  assert.equal(result.version, 1);
  assert.equal(result.previousVersion, 0);
  assert.deepEqual(result.patch, {
    kind: "replace",
    from: 0,
    to: 1,
    state: {
      title: "Inbox",
      todos: [{ id: "todo-1", text: "Ship v0", done: false, createdAt: 123 }],
    },
  });
  assert.deepEqual(store.getState(), result.state);
});

test("dispatch accepts action objects with base version guards", () => {
  const store = createTodoStore();
  const result = store.dispatch({ type: "replaceTitle", payload: "Today", baseVersion: 0 });

  assert.equal(result.ok, true);
  assert.equal(store.version(), 1);
  assert.equal(store.getState().title, "Today");

  assert.deepEqual(store.dispatch({ type: "replaceTitle", payload: "Later", baseVersion: 0 }), {
    ok: false,
    reason: "version_conflict",
    version: 1,
    expectedVersion: 0,
  });
});

test("unknown and malformed actions fail closed", () => {
  const store = createTodoStore();

  assert.throws(() => store.dispatch("missing"), StoreError);
  assert.throws(() => store.dispatch({ type: "" }), StoreError);
  assert.throws(() => store.dispatch(null), StoreError);
});

test("no-op transitions do not bump the version or notify subscribers", () => {
  const store = createTodoStore();
  let calls = 0;

  store.subscribe(
    (state) => state,
    () => {
      calls += 1;
    },
  );

  const result = store.dispatch("noop");

  assert.equal(result.ok, true);
  assert.equal(result.noop, true);
  assert.equal(result.version, 0);
  assert.equal(store.version(), 0);
  assert.equal(calls, 0);
});

test("snapshot and hydrate replace state with explicit versions", () => {
  const source = createTodoStore();
  source.dispatch("addTodo", "Mirror me");
  const snapshot = source.snapshot();

  const replica = createTodoStore();
  const hydrated = replica.hydrate(snapshot);

  assert.deepEqual(hydrated, snapshot);
  assert.deepEqual(replica.getState(), source.getState());
  assert.equal(replica.version(), 1);
});

test("applyPatch accepts matching replace patches and rejects stale patches", () => {
  const store = createTodoStore();
  const patch = createReplacePatch(0, 1, {
    title: "Patched",
    todos: [],
  });

  assert.deepEqual(store.applyPatch(patch), createSnapshot(1, patch.state));
  assert.equal(store.getState().title, "Patched");
  assert.throws(() => store.applyPatch(patch), StoreError);
  assert.throws(() => store.applyPatch({ kind: "merge", from: 1, to: 2, state: {} }), StoreError);
});

test("subscriptions are selector-scoped and support custom equality", () => {
  const store = createTodoStore();
  const events = [];

  const unsubscribe = store.subscribe(
    (state) => state.todos.length,
    (next, previous, meta) => {
      events.push({ next, previous, version: meta.version, source: meta.source });
    },
  );

  store.dispatch("replaceTitle", "Other");
  store.dispatch("addTodo", "A");
  unsubscribe();
  store.dispatch("addTodo", "B");

  assert.deepEqual(events, [{ next: 1, previous: 0, version: 2, source: "dispatch" }]);

  let parityCalls = 0;
  store.subscribe(
    (state) => ({ parity: state.todos.length % 2 }),
    () => {
      parityCalls += 1;
    },
    { equals: (left, right) => left.parity === right.parity },
  );
  store.dispatch("addTodo", "C");
  store.dispatch("addTodo", "D");

  assert.equal(parityCalls, 2);
});

test("fireImmediately calls listener with current selected value", () => {
  const store = createTodoStore();
  const events = [];

  store.subscribe(
    (state) => state.title,
    (next, previous, meta) => events.push({ next, previous, source: meta.source }),
    { fireImmediately: true },
  );

  assert.deepEqual(events, [{ next: "Inbox", previous: "Inbox", source: "hydrate" }]);
});

test("freeze mode recursively freezes initial and next states", () => {
  const store = createTodoStore({ freeze: true });

  assert.equal(Object.isFrozen(store.getState()), true);
  assert.equal(Object.isFrozen(store.getState().todos), true);

  store.dispatch("addTodo", "Frozen");

  assert.equal(Object.isFrozen(store.getState()), true);
  assert.equal(Object.isFrozen(store.getState().todos), true);
  assert.equal(Object.isFrozen(store.getState().todos[0]), true);
  assert.throws(() => {
    store.getState().todos[0].done = true;
  }, TypeError);
});

test("deepFreeze handles primitive values and nested arrays", () => {
  const value = { nested: [{ ok: true }] };

  assert.equal(deepFreeze(null), null);
  assert.equal(deepFreeze("x"), "x");
  assert.equal(deepFreeze(value), value);
  assert.equal(Object.isFrozen(value), true);
  assert.equal(Object.isFrozen(value.nested), true);
  assert.equal(Object.isFrozen(value.nested[0]), true);
});

test("subpath imports expose focused APIs", () => {
  assert.equal(createStoreFromSubpath, createStore);
  assert.deepEqual(createSnapshot(7, { ok: true }), { version: 7, state: { ok: true } });
  assert.throws(() => createSnapshot(-1, {}), StoreError);
  assert.throws(() => createReplacePatch(1, 1, {}), StoreError);
});

test("resolves public package subpaths", async () => {
  const root = await import("@ts-zero/store");
  const create = await import("@ts-zero/store/create");
  const freeze = await import("@ts-zero/store/freeze");
  const snapshot = await import("@ts-zero/store/snapshot");
  const types = await import("@ts-zero/store/types");

  assert.equal(typeof root.createStore, "function");
  assert.equal(typeof create.createStore, "function");
  assert.equal(typeof freeze.deepFreeze, "function");
  assert.equal(typeof snapshot.createSnapshot, "function");
  assert.deepEqual(Object.keys(types), []);
});

test("public barrel remains a re-export-only module for tree-checking", () => {
  const source = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");

  assert.match(source, /^export /m);
  assert.doesNotMatch(source, /function\s+/);
  assert.doesNotMatch(source, /const\s+/);
  assert.doesNotMatch(source, /let\s+/);
  assert.doesNotMatch(source, /class\s+/);
});
