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
    <nav aria-label="Todo navigation">
      <a class={page === "todos" ? "active" : ""} href={routes.home} onClick={navigateTo(uiStore, "todos", routes.home)}>
        Todos
      </a>
      <a class={page === "stats" ? "active" : ""} href={routes.stats} onClick={navigateTo(uiStore, "stats", routes.stats)}>
        Stats
      </a>
    </nav>
  );
}
