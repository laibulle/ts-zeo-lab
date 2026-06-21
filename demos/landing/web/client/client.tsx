import { render } from "solid-js/web";
import { TodoApp } from "./app.js";
import { createCounterClient } from "./counter-mutations.js";
import { createCounterStore } from "./counter-store.js";
import { createTodoMutationClient } from "./mutations.js";
import { createUiStore, getPageFromLocation } from "./navigation.js";
import { createTodoStore } from "./todo-store.js";
import { routes } from "../shared/routes.js";
import type { CounterBootstrap, Snapshot } from "../shared/types.js";

const initialState = document.getElementById("initial-state");
const initialCounterState = document.getElementById("initial-counter-state");

if (initialState === null || initialState.textContent === null) {
  throw new Error("Missing initial todo state");
}

if (initialCounterState === null || initialCounterState.textContent === null) {
  throw new Error("Missing initial counter state");
}

const initial = JSON.parse(initialState.textContent) as Snapshot;
const initialCounter = JSON.parse(initialCounterState.textContent) as CounterBootstrap;
const store = createTodoStore(initial);
const counterStore = createCounterStore(initialCounter.snapshot);
const uiStore = createUiStore(getPageFromLocation(routes));
const mutations = createTodoMutationClient({
  endpoint: routes.mutations,
  store,
});
const counterClient = createCounterClient({
  endpoint: routes.counterMutations,
  store: counterStore,
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
    counterClient={counterClient}
    counterStore={counterStore}
    counterStreams={initialCounter.streams}
    store={store}
    uiStore={uiStore}
    mutations={mutations}
    routes={routes}
  />
), target);
