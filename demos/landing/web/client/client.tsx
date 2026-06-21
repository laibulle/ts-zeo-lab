import { render } from "solid-js/web";
import { TodoApp } from "./app.js";
import { createBlocksClient } from "./blocks-mutations.js";
import { createBlocksStore } from "./blocks-store.js";
import { createCounterClient } from "./counter-mutations.js";
import { createCounterStore } from "./counter-store.js";
import { createTodoMutationClient } from "./mutations.js";
import { createUiStore, getPageFromLocation } from "./navigation.js";
import { createTodoStore } from "./todo-store.js";
import { routes } from "../shared/routes.js";
import type { BlocksBootstrap, CounterBootstrap, Snapshot } from "../shared/types.js";

const initialState = document.getElementById("initial-state");
const initialCounterState = document.getElementById("initial-counter-state");
const initialBlocksState = document.getElementById("initial-blocks-state");

if (initialState === null || initialState.textContent === null) {
  throw new Error("Missing initial todo state");
}

if (initialCounterState === null || initialCounterState.textContent === null) {
  throw new Error("Missing initial counter state");
}

if (initialBlocksState === null || initialBlocksState.textContent === null) {
  throw new Error("Missing initial blocks state");
}

const initial = JSON.parse(initialState.textContent) as Snapshot;
const initialCounter = JSON.parse(initialCounterState.textContent) as CounterBootstrap;
const initialBlocks = JSON.parse(initialBlocksState.textContent) as BlocksBootstrap;
const store = createTodoStore(initial);
const counterStore = createCounterStore(initialCounter.snapshot);
const blocksStore = createBlocksStore(initialBlocks.snapshot);
const uiStore = createUiStore(getPageFromLocation(routes));
const mutations = createTodoMutationClient({
  endpoint: routes.mutations,
  store,
});
const counterClient = createCounterClient({
  endpoint: routes.counterMutations,
  reconcileEndpoint: routes.counterReconcile,
  store: counterStore,
});
const blocksClient = createBlocksClient({
  endpoint: routes.blocksMutations,
  reconcileEndpoint: routes.blocksReconcile,
  store: blocksStore,
});
const target = document.getElementById("app");

if (target === null) {
  throw new Error("Missing app target");
}

addEventListener("popstate", () => {
  uiStore.dispatch("navigate", getPageFromLocation(routes));
});

target.textContent = "";
render(() => (
  <TodoApp
    blocksClient={blocksClient}
    blocksStreams={initialBlocks.streams}
    blocksStore={blocksStore}
    counterClient={counterClient}
    counterStore={counterStore}
    counterStreams={initialCounter.streams}
    store={store}
    uiStore={uiStore}
    mutations={mutations}
    routes={routes}
  />
), target);
