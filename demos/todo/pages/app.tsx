import { select } from "@ts-zero/html/bindings";
import type { HtmlChild } from "@ts-zero/html/types";
import { TodoHeader } from "../components/header.js";
import { TodoNavigation } from "../components/navigation.js";
import { StatsPage } from "./stats.js";
import { TodoPage } from "./todos.js";
import type { Routes, TodoStore, UiStore } from "./types.js";

export function TodoApp({
  store,
  uiStore,
  routes,
}: {
  readonly store: TodoStore;
  readonly uiStore: UiStore;
  readonly routes: Routes;
}): HtmlChild {
  return (
    <>
      <TodoHeader store={store} />
      {select(uiStore, (state) => state.page, (page) => (
        <>
          <TodoNavigation page={page} uiStore={uiStore} routes={routes} />
          {page === "stats" ? <StatsPage store={store} /> : <TodoPage store={store} routes={routes} />}
        </>
      ))}
    </>
  );
}
