import { list } from "@ts-zero/html/bindings";
import type { HtmlChild } from "@ts-zero/html/types";
import { withServerPost } from "../pages/server-post.js";
import type { Routes, Todo, TodoStore } from "../pages/types.js";

export function TodoList({ store, routes }: { readonly store: TodoStore; readonly routes: Routes }): HtmlChild {
  return (
    <ul>
      {list(
        store,
        (state) => state.todos,
        (todo) => todo.id,
        (todo) => <TodoItem store={store} routes={routes} todo={todo} />,
      )}
    </ul>
  );
}

function TodoItem({
  store,
  routes,
  todo,
}: {
  readonly store: TodoStore;
  readonly routes: Routes;
  readonly todo: Todo;
}): HtmlChild {
  return (
    <li class={todo.completed ? "done" : ""}>
      <span class="title">{todo.title}</span>
      <form
        method="post"
        action={routes.toggleTodo(todo.id)}
        onSubmit={withServerPost((event) => {
          event.preventDefault();
          store.dispatch("toggleTodo", todo.id);
        })}
      >
        <button class="secondary" type="submit">{todo.completed ? "Reopen" : "Done"}</button>
      </form>
      <form
        method="post"
        action={routes.deleteTodo(todo.id)}
        onSubmit={withServerPost((event) => {
          event.preventDefault();
          store.dispatch("deleteTodo", todo.id);
        })}
      >
        <button class="danger" type="submit">Delete</button>
      </form>
    </li>
  );
}
