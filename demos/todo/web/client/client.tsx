import { mount } from "@ts-zero/html/mount";
import { TodoApp } from "./app.js";
import { createUiStore, getPageFromLocation } from "./navigation.js";
import { createTodoStore } from "./todo-store.js";
import { routes } from "../shared/routes.js";
import type { Snapshot } from "../shared/types.js";

const initialState = document.getElementById("initial-state");

if (initialState === null || initialState.textContent === null) {
  throw new Error("Missing initial todo state");
}

const initial = JSON.parse(initialState.textContent) as Snapshot;
const store = createTodoStore(initial);
const uiStore = createUiStore(getPageFromLocation(routes));
const target = document.getElementById("app");

if (target === null) {
  throw new Error("Missing app target");
}

addEventListener("popstate", () => {
  uiStore.dispatch("navigate", getPageFromLocation(routes));
});

mount(target, <TodoApp store={store} uiStore={uiStore} routes={routes} />);
