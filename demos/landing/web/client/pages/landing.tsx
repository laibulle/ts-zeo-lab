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
          <h2 id="landing-title">Small packages for a serious full-stack runtime.</h2>
          <p>
            A dark little lab for SSR, client takeover, immutable state, compact mutations,
            native runtime experiments and deployable web standards.
          </p>
        </div>
        <a class="primary-link" href={routes.todos} onClick={navigateTo(uiStore, "todos", routes.todos)}>
          Open todo demo
        </a>
      </section>

      <section class="demo-grid" aria-label="Available demos">
        <a class="demo-tile" href={routes.counter} onClick={navigateTo(uiStore, "counter", routes.counter)}>
          <span class="demo-kicker">distributed</span>
          <strong>Counter runtime</strong>
          <span>Versioned state, compact mutations and live SSE when hosted on a long-running runtime.</span>
        </a>
        <a class="demo-tile" href={routes.blocks} onClick={navigateTo(uiStore, "blocks", routes.blocks)}>
          <span class="demo-kicker">collaborative</span>
          <strong>Block editor</strong>
          <span>Notion-style offline edits, mergeable inserts and conflict repair through snapshots.</span>
        </a>
        <a class="demo-tile" href={routes.todos} onClick={navigateTo(uiStore, "todos", routes.todos)}>
          <span class="demo-kicker">interactive</span>
          <strong>Todo app</strong>
          <span>SSR first load, Solid client takeover, SQLite persistence and compact mutation acks.</span>
        </a>
        <a class="demo-tile" href={routes.stats} onClick={navigateTo(uiStore, "stats", routes.stats)}>
          <span class="demo-kicker">derived state</span>
          <strong>Live stats</strong>
          <span>Shared immutable store selectors rendered server-side and updated client-side.</span>
        </a>
        <div class="demo-tile">
          <span class="demo-kicker">native host</span>
          <strong>Native runtime</strong>
          <span>JavaScriptCore host events and native capabilities for the macOS prototype.</span>
        </div>
      </section>

      <section class="docs" aria-label="Demo documentation">
        <div class="docs-intro">
          <p class="eyebrow">demo docs</p>
          <h3>What this page exercises</h3>
          <p>
            The landing is intentionally small, but it is wired like a deployable product:
            server-rendered HTML first, a bundled client after, and explicit transport contracts.
          </p>
        </div>
        <div class="doc-list">
          <article class="doc-card">
            <strong>Web rendering</strong>
            <p>Initial requests return HTML from `@ts-zero/http`; navigation is then handled in the client without a page reload.</p>
          </article>
          <article class="doc-card">
            <strong>State and mutations</strong>
            <p>`@ts-zero/store` keeps immutable snapshots, while `@ts-zero/mutation` sends compact action acknowledgements.</p>
          </article>
          <article class="doc-card">
            <strong>Deployment paths</strong>
            <p>Vercel uses a Web Function and an in-memory repository. Docker Bun uses a long-running process and SQLite.</p>
          </article>
        </div>
      </section>

      <section class="runtime-strip" aria-label="Runtime targets">
        <div><span>Serverless</span><strong>Vercel Web Function</strong></div>
        <div><span>Container</span><strong>Bun + SQLite</strong></div>
        <div><span>Native</span><strong>JavaScriptCore host</strong></div>
      </section>
    </>
  );
}
