import { createStore } from "@ts-zero/store/create";
import type { Page, Routes, UiState, UiStore } from "../shared/types.js";

export function createUiStore(page: Page): UiStore {
  return createStore<UiState>({
    state: { page },
    transitions: {
      navigate: (state, nextPage: unknown) => {
        if (nextPage !== "landing" && nextPage !== "blocks" && nextPage !== "counter" && nextPage !== "todos" && nextPage !== "stats") {
          return state;
        }

        return { page: nextPage };
      },
    },
  });
}

export function getPageFromLocation(knownRoutes: Routes): Page {
  if (location.pathname === knownRoutes.stats) {
    return "stats";
  }

  if (location.pathname === knownRoutes.counter) {
    return "counter";
  }

  if (location.pathname === knownRoutes.blocks) {
    return "blocks";
  }

  if (location.pathname === knownRoutes.todos) {
    return "todos";
  }

  return "landing";
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
