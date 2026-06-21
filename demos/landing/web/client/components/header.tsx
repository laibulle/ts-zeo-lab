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
        <h1>{page === "landing" ? "ts-zero landing" : page === "counter" ? "Distributed counter" : page === "blocks" ? "Collaborative blocks" : "Todo demo"}</h1>
      </div>
      <div class="count">
        {page === "landing"
          ? "SSR, client navigation, stores, mutations, native runtime"
          : page === "counter"
            ? "Versioned state, compact actions, live stream when the runtime allows it"
            : page === "blocks"
              ? "Offline edits, mergeable inserts, conflict snapshots and explicit reconciliation"
            : label()}
      </div>
    </header>
  );
}
