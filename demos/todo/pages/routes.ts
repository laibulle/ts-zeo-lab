import { createStore } from "@ts-zero/store/create";
import type { Page, Routes, UiState, UiStore } from "./types.js";

export const routes: Routes = {
  createTodo: "/todos/",
  home: "/",
  stats: "/stats",
  toggleTodo: (id) => `/todos/${encodeURIComponent(id)}/toggle`,
  deleteTodo: (id) => `/todos/${encodeURIComponent(id)}/delete`,
};

export function createUiStore(page: Page): UiStore {
  return createStore<UiState>({
    state: { page },
    transitions: {
      navigate: (state, nextPage: unknown) => {
        if (nextPage !== "todos" && nextPage !== "stats") {
          return state;
        }

        return { page: nextPage };
      },
    },
  });
}

export function getPageFromLocation(knownRoutes: Routes): Page {
  return location.pathname === knownRoutes.stats ? "stats" : "todos";
}

export function navigateTo(uiStore: UiStore, page: Page, path: string): (event: MouseEvent) => void {
  return (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    event.preventDefault();

    if (location.pathname !== path) {
      history.pushState(null, "", path);
    }

    uiStore.dispatch("navigate", page);
  };
}
