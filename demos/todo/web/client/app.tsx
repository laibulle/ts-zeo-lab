import { select } from "@ts-zero/html/bindings";
import type { HtmlChild } from "@ts-zero/html/types";
import { TodoHeader } from "./components/header.js";
import { TodoNavigation } from "./components/navigation.js";
import { StatsPage } from "./pages/stats.js";
import { TodoPage } from "./pages/todos.js";
import type { TodoWebRuntime } from "./runtime.js";
import type { Routes, TodoStore, UiStore } from "../shared/types.js";

export function TodoApp({
  store,
  uiStore,
  runtime,
  routes,
}: {
  readonly store: TodoStore;
  readonly uiStore: UiStore;
  readonly runtime: TodoWebRuntime;
  readonly routes: Routes;
}): HtmlChild {
  return (
    <>
      <TodoHeader store={store} />
      {select(uiStore, (state) => state.page, (page) => (
        <>
          <TodoNavigation page={page} uiStore={uiStore} routes={routes} />
          {page === "stats" ? <StatsPage store={store} /> : <TodoPage store={store} runtime={runtime} routes={routes} />}
        </>
      ))}
    </>
  );
}
