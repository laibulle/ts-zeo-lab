import { createMemo } from "solid-js";
import { useStoreState } from "../solid-store.js";
import { selectTodoCountLabel } from "../todo-store.js";
import type { Page, TodoStore } from "../../shared/types.js";

export function TodoHeader({ page, store }: { readonly page: Page; readonly store: TodoStore }) {
  const state = useStoreState(store);
  const label = createMemo(() => selectTodoCountLabel(state()));

  return (
    <header>
      <div>
        <p class="eyebrow">ts-zero demo lab</p>
        <h1>{page === "landing" ? "ts-zero landing" : "Todo demo"}</h1>
      </div>
      <div class="count">{page === "landing" ? "SSR, client navigation, stores, mutations, native runtime" : label()}</div>
    </header>
  );
}
