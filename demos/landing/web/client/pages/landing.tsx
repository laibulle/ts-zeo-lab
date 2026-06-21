import { navigateTo } from "../navigation.js";
import type { Routes, UiStore } from "../../shared/types.js";

export function LandingPage({
  routes,
  uiStore,
}: {
  readonly routes: Routes;
  readonly uiStore: UiStore;
}) {
  return (
    <>
      <section class="hero" aria-labelledby="landing-title">
        <div>
          <p class="eyebrow">zero dependency primitives</p>
          <h2 id="landing-title">Build the framework surface from small, inspectable packages.</h2>
          <p>
            This demo is the playground for SSR, client takeover, immutable state, compact mutations,
            native runtime experiments and clean application boundaries.
          </p>
        </div>
        <a class="primary-link" href={routes.todos} onClick={navigateTo(uiStore, "todos", routes.todos)}>
          Open todo demo
        </a>
      </section>

      <section class="demo-grid" aria-label="Available demos">
        <a class="demo-tile" href={routes.todos} onClick={navigateTo(uiStore, "todos", routes.todos)}>
          <strong>Todo app</strong>
          <span>SSR first load, Solid client takeover, SQLite persistence and compact mutation acks.</span>
        </a>
        <a class="demo-tile" href={routes.stats} onClick={navigateTo(uiStore, "stats", routes.stats)}>
          <strong>Live stats</strong>
          <span>Shared immutable store selectors rendered server-side and updated client-side.</span>
        </a>
        <div class="demo-tile">
          <strong>Native runtime</strong>
          <span>JavaScriptCore host events and native capabilities for the macOS prototype.</span>
        </div>
      </section>
    </>
  );
}
