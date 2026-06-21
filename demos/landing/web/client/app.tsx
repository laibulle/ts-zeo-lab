import { Match, Switch } from "solid-js";
import { TodoHeader } from "./components/header.js";
import { TodoNavigation } from "./components/navigation.js";
import { LandingPage } from "./pages/landing.js";
import { StatsPage } from "./pages/stats.js";
import { TodoPage } from "./pages/todos.js";
import type { TodoMutationClient } from "./mutations.js";
import { useStoreState } from "./solid-store.js";
import type { Routes, TodoStore, UiStore } from "../shared/types.js";

export function TodoApp({
  store,
  uiStore,
  mutations,
  routes,
}: {
  readonly store: TodoStore;
  readonly uiStore: UiStore;
  readonly mutations: TodoMutationClient;
  readonly routes: Routes;
}) {
  const uiState = useStoreState(uiStore);

  return (
    <>
      <TodoHeader page={uiState().page} store={store} />
      <TodoNavigation page={uiState().page} uiStore={uiStore} routes={routes} />
      <Switch>
        <Match when={uiState().page === "landing"}>
          <LandingPage uiStore={uiStore} routes={routes} />
        </Match>
        <Match when={uiState().page === "stats"}>
          <StatsPage store={store} />
        </Match>
        <Match when={uiState().page === "todos"}>
          <TodoPage store={store} mutations={mutations} routes={routes} />
        </Match>
      </Switch>
    </>
  );
}
