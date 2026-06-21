import { select } from "@ts-zero/html/bindings";
import type { HtmlChild } from "@ts-zero/html/types";
import { selectTodoCountLabel } from "../todo-store.js";
import type { TodoStore } from "../../shared/types.js";

export function TodoHeader({ store }: { readonly store: TodoStore }): HtmlChild {
  return (
    <header>
      <h1>ts-zero todo</h1>
      {select(store, selectTodoCountLabel, (label) => <div class="count">{label}</div>)}
    </header>
  );
}
