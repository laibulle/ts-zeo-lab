import { navigateTo } from "../navigation.js";
import type { Page, Routes, UiStore } from "../../shared/types.js";

export function TodoNavigation({
  page,
  uiStore,
  routes,
}: {
  readonly page: Page;
  readonly uiStore: UiStore;
  readonly routes: Routes;
}) {
  return (
    <nav aria-label="Demo navigation">
      <a class={page === "landing" ? "active" : ""} href={routes.home} onClick={navigateTo(uiStore, "landing", routes.home)}>
        Overview
      </a>
      <a class={page === "counter" ? "active" : ""} href={routes.counter} onClick={navigateTo(uiStore, "counter", routes.counter)}>
        Counter
      </a>
      <a class={page === "blocks" ? "active" : ""} href={routes.blocks} onClick={navigateTo(uiStore, "blocks", routes.blocks)}>
        Blocks
      </a>
      <a class={page === "todos" ? "active" : ""} href={routes.todos} onClick={navigateTo(uiStore, "todos", routes.todos)}>
        Todos
      </a>
      <a class={page === "stats" ? "active" : ""} href={routes.stats} onClick={navigateTo(uiStore, "stats", routes.stats)}>
        Stats
      </a>
    </nav>
  );
}
