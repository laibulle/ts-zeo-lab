import { Show } from "solid-js";
import { TodoHeader } from "./components/header.js";
import { TodoNavigation } from "./components/navigation.js";
import { StatsPage } from "./pages/stats.js";
import { TodoPage } from "./pages/todos.js";
import type { TodoWebRuntime } from "./runtime.js";
import { useStoreState } from "./solid-store.js";
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
}) {
  const uiState = useStoreState(uiStore);

  return (
    <>
      <TodoHeader store={store} />
      <TodoNavigation page={uiState().page} uiStore={uiStore} routes={routes} />
      <Show
        when={uiState().page === "stats"}
        fallback={<TodoPage store={store} runtime={runtime} routes={routes} />}
      >
        <StatsPage store={store} />
      </Show>
    </>
  );
}
