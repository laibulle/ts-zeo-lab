import { createMemo } from "solid-js";
import { useStoreState } from "../solid-store.js";
import { selectTodoCountLabel } from "../todo-store.js";
import type { TodoStore } from "../../shared/types.js";

export function TodoHeader({ store }: { readonly store: TodoStore }) {
  const state = useStoreState(store);
  const label = createMemo(() => selectTodoCountLabel(state()));

  return (
    <header>
      <h1>ts-zero todo</h1>
      <div class="count">{label()}</div>
    </header>
  );
}
