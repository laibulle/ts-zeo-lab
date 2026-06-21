import { For } from "solid-js";
import type { TodoMutationClient } from "../mutations.js";
import { useStoreState } from "../solid-store.js";
import type { Routes, Todo, TodoStore } from "../../shared/types.js";

export function TodoList({
  mutations,
  store,
  routes,
}: {
  readonly mutations: TodoMutationClient;
  readonly store: TodoStore;
  readonly routes: Routes;
}) {
  const state = useStoreState(store);

  return (
    <ul>
      <For each={state().todos}>
        {(todo) => <TodoItem mutations={mutations} routes={routes} todo={todo} />}
      </For>
    </ul>
  );
}

function TodoItem({
  mutations,
  routes,
  todo,
}: {
  readonly mutations: TodoMutationClient;
  readonly routes: Routes;
  readonly todo: Todo;
}) {
  return (
    <li class={todo.completed ? "done" : ""}>
      <span class="title">{todo.title}</span>
      <form
        method="post"
        action={routes.toggleTodo(todo.id)}
        onSubmit={(event: SubmitEvent) => {
          event.preventDefault();
          void mutations.dispatch("toggle", { id: todo.id });
        }}
      >
        <button class="secondary" type="submit">{todo.completed ? "Reopen" : "Done"}</button>
      </form>
      <form
        method="post"
        action={routes.deleteTodo(todo.id)}
        onSubmit={(event: SubmitEvent) => {
          event.preventDefault();
          void mutations.dispatch("delete", { id: todo.id });
        }}
      >
        <button class="danger" type="submit">Delete</button>
      </form>
    </li>
  );
}
