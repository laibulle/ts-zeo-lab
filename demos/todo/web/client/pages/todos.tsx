import type { HtmlChild } from "@ts-zero/html/types";
import { TodoComposer } from "../components/todo-composer.js";
import { TodoList } from "../components/todo-list.js";
import type { TodoWebRuntime } from "../runtime.js";
import type { Routes, TodoStore } from "../../shared/types.js";

export function TodoPage({
  store,
  runtime,
  routes,
}: {
  readonly store: TodoStore;
  readonly runtime: TodoWebRuntime;
  readonly routes: Routes;
}): HtmlChild {
  return (
    <>
      <TodoComposer runtime={runtime} action={routes.createTodo} />
      <TodoList runtime={runtime} store={store} routes={routes} />
    </>
  );
}
