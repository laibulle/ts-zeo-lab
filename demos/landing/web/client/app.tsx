import { Match, Switch } from "solid-js";
import { TodoHeader } from "./components/header.js";
import { TodoNavigation } from "./components/navigation.js";
import { LandingPage } from "./pages/landing.js";
import { CounterPage } from "./pages/counter.js";
import { StatsPage } from "./pages/stats.js";
import { TodoPage } from "./pages/todos.js";
import type { CounterClient } from "./counter-mutations.js";
import type { TodoMutationClient } from "./mutations.js";
import { useStoreState } from "./solid-store.js";
import type { CounterStore, Routes, TodoStore, UiStore } from "../shared/types.js";

export function TodoApp({
  counterClient,
  counterStore,
  counterStreams,
  store,
  uiStore,
  mutations,
  routes,
}: {
  readonly counterClient: CounterClient;
  readonly counterStore: CounterStore;
  readonly counterStreams: boolean;
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
        <Match when={uiState().page === "counter"}>
          <CounterPage client={counterClient} routes={routes} store={counterStore} streams={counterStreams} />
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
