import type { HtmlChild } from "@ts-zero/html/types";
import { TodoComposer } from "../components/todo-composer.js";
import { TodoList } from "../components/todo-list.js";
import type { Routes, TodoStore } from "../../shared/types.js";

export function TodoPage({ store, routes }: { readonly store: TodoStore; readonly routes: Routes }): HtmlChild {
  return (
    <>
      <TodoComposer store={store} action={routes.createTodo} />
      <TodoList store={store} routes={routes} />
    </>
  );
}
