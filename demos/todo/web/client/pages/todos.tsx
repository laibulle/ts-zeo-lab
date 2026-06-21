import { TodoComposer } from "../components/todo-composer.js";
import { TodoList } from "../components/todo-list.js";
import type { TodoMutationClient } from "../mutations.js";
import type { Routes, TodoStore } from "../../shared/types.js";

export function TodoPage({
  store,
  mutations,
  routes,
}: {
  readonly store: TodoStore;
  readonly mutations: TodoMutationClient;
  readonly routes: Routes;
}) {
  return (
    <>
      <TodoComposer mutations={mutations} action={routes.createTodo} />
      <TodoList mutations={mutations} store={store} routes={routes} />
    </>
  );
}
