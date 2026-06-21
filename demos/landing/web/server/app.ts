import { readFile } from "node:fs/promises";

import { createApp, html, json, redirect, text } from "@ts-zero/http";
import { defineRoutes } from "@ts-zero/router";
import type { App, Context, Handler, HttpMethod } from "@ts-zero/http";
import type { Router } from "@ts-zero/router";
import {
  createActionResult,
  createSnapshotResult,
  getMutationRequest,
  isVersionCurrent,
} from "@ts-zero/mutation/protocol";
import { validate } from "@ts-zero/uuid/format";
import { v7 } from "@ts-zero/uuid/v7";
import { createTodoProjection } from "../../application/todo-projection.js";
import { createTodoUseCases } from "../../application/todo-use-cases.js";
import type { Todo } from "../../domain/todo.js";
import { openTodoRepository } from "../../infrastructure/todo-repository.js";
import type { Page, TodoMutationActionResult, TodoMutationActionType, TodoMutationPayload, TodoRuntimeResult } from "../shared/types.js";

const clientFile = new URL("../public/client.mjs", import.meta.url);
const publicDirectory = new URL("../public/", import.meta.url);
const clientEntry = process.env.TODO_CLIENT_ENTRY ?? "/client.mjs";
const todoRepository = await openTodoRepository();
const todoUseCases = createTodoUseCases({
  repository: todoRepository,
  createId: v7,
  isTodoId: validate,
});

todoUseCases.seed();

const store = createTodoProjection({
  todos: todoUseCases.listTodos(),
});

export const app = createApp();

export const router = defineRoutes<Handler>((r) => {
  r.pipeline("browser", []);

  r.scope("/", { pipe: "browser" }, (r) => {
    r.get("home", "/", renderHome);
    r.get("todos", "/todos", renderTodos);
    r.get("stats", "/stats", renderStats);
    r.get("client", "/client.mjs", renderClientModule);
    r.get("client.asset", "/assets/:file", serveClientAsset);
    r.scope("/todos", (r) => {
      r.post("todos.actions", "/actions", handleTodoAction);
      r.post("todos.create", "/", createTodo);
      r.post("todos.toggle", "/:id/toggle", toggleTodo);
      r.post("todos.delete", "/:id/delete", deleteTodo);
    });
  });
});

mountRoutes(app, router);

function mountRoutes(app: App, router: Router<Handler>): void {
  for (const route of router.routes) {
    app.route(route.method as HttpMethod, route.path, route.handler);
  }
}

function renderHome(): Response {
  return html(renderPage("landing"));
}

function renderTodos(): Response {
  return html(renderPage("todos"));
}

function renderStats(): Response {
  return html(renderPage("stats"));
}

async function renderClientModule(): Promise<Response> {
  return javascript(await readFile(clientFile, "utf8"));
}

async function serveClientAsset({ params }: Context): Promise<Response> {
  const file = safeAssetFile(params.file);

  if (file === null) {
    return text("Not Found", { status: 404 });
  }

  return staticAsset(await readFile(file), contentTypeFor(file.pathname));
}

async function createTodo({ request }: Context): Promise<Response> {
  const form = await readForm(request);
  const todo = todoUseCases.createTodo({
    id: form.get("id"),
    title: form.get("title"),
  });

  if (todo !== null) {
    store.dispatch("createTodo", todo);
  }

  return redirect(router.path("todos"));
}

function toggleTodo({ params }: Context): Response {
  if (todoUseCases.toggleTodo({ id: params.id })) {
    store.dispatch("toggleTodo", params.id);
  }

  return redirect(router.path("todos"));
}

function deleteTodo({ params }: Context): Response {
  if (todoUseCases.deleteTodo({ id: params.id })) {
    store.dispatch("deleteTodo", params.id);
  }

  return redirect(router.path("todos"));
}

async function handleTodoAction({ request }: Context): Promise<Response> {
  return json(dispatchTodoMutation(await request.json()));
}

function dispatchTodoMutation(payload: unknown): TodoRuntimeResult {
  const request = getMutationRequest(payload);
  const command = asRecord(request.action.payload);
  const previousVersion = store.version();

  if (request.action.type === "create") {
    const todo = todoUseCases.createTodo({
      id: command.id,
      title: command.title,
    });

    if (todo === null) {
      return snapshotResult();
    }

    store.dispatch("createTodo", todo);
    return isVersionCurrent(request, previousVersion)
      ? actionResult(previousVersion, "createTodo", todo)
      : snapshotResult();
  }

  if (request.action.type === "toggle") {
    if (todoUseCases.toggleTodo({ id: command.id })) {
      store.dispatch("toggleTodo", command.id);
      return isVersionCurrent(request, previousVersion)
        ? actionResult(previousVersion, "toggleTodo", String(command.id))
        : snapshotResult();
    }

    return snapshotResult();
  }

  if (request.action.type === "delete") {
    if (todoUseCases.deleteTodo({ id: command.id })) {
      store.dispatch("deleteTodo", command.id);
      return isVersionCurrent(request, previousVersion)
        ? actionResult(previousVersion, "deleteTodo", String(command.id))
        : snapshotResult();
    }

    return snapshotResult();
  }

  return snapshotResult();
}

function actionResult(
  previousVersion: number,
  type: TodoMutationActionType,
  payload: TodoMutationPayload,
): TodoMutationActionResult {
  return createActionResult(previousVersion, store.version(), type, payload) as TodoMutationActionResult;
}

function snapshotResult(): TodoRuntimeResult {
  return createSnapshotResult(store.snapshot());
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value === null || value === undefined || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

async function readForm(request: Request): Promise<URLSearchParams> {
  const body = await request.text();
  return new URLSearchParams(body);
}

function renderPage(page: Page): string {
  const { todos } = store.getState();
  const remaining = todos.filter((todo) => !todo.completed).length;
  const snapshot = JSON.stringify(store.snapshot()).replaceAll("<", "\\u003c");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>ts-zero demos</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        --bg: #05070d;
        --bg-soft: #090d16;
        --surface: rgba(15, 21, 34, 0.86);
        --surface-strong: rgba(21, 30, 48, 0.96);
        --line: rgba(148, 163, 184, 0.18);
        --line-strong: rgba(148, 163, 184, 0.32);
        --text: #f7fbff;
        --muted: #9aa8bb;
        --dim: #64748b;
        --accent: #65e4ff;
        --accent-strong: #8b5cf6;
        --danger: #fb7185;
        background: var(--bg);
        color: var(--text);
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        background:
          radial-gradient(circle at 18% 0%, rgba(101, 228, 255, 0.16), transparent 30%),
          radial-gradient(circle at 82% 10%, rgba(139, 92, 246, 0.18), transparent 34%),
          linear-gradient(180deg, #05070d 0%, #080b13 46%, #05070d 100%);
      }

      main {
        width: min(1080px, calc(100% - 32px));
        margin: 0 auto;
        padding: 42px 0 72px;
      }

      header {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 24px;
        margin-bottom: 20px;
      }

      h1 {
        margin: 0;
        font-size: 28px;
        line-height: 1.1;
        letter-spacing: 0;
      }

      h2 {
        margin: 0;
        max-width: 780px;
        font-size: clamp(44px, 7vw, 82px);
        line-height: 0.96;
        letter-spacing: 0;
      }

      h3 {
        margin: 0;
        font-size: 28px;
        line-height: 1.08;
      }

      p {
        margin: 0;
      }

      .eyebrow {
        margin: 0 0 8px;
        color: var(--accent);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .count {
        max-width: 420px;
        color: var(--muted);
        font-size: 14px;
        line-height: 1.5;
        text-align: right;
        white-space: nowrap;
      }

      .hero {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: end;
        gap: 32px;
        margin: 22px 0 18px;
        padding: 64px 0 36px;
        border-top: 1px solid var(--line);
      }

      .hero p:not(.eyebrow) {
        max-width: 690px;
        margin-top: 22px;
        color: var(--muted);
        font-size: 18px;
        line-height: 1.65;
      }

      .primary-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 44px;
        padding: 0 16px;
        border: 1px solid rgba(101, 228, 255, 0.48);
        border-radius: 6px;
        background: linear-gradient(135deg, rgba(101, 228, 255, 0.16), rgba(139, 92, 246, 0.2));
        color: var(--text);
        font-size: 14px;
        font-weight: 700;
        text-decoration: none;
        white-space: nowrap;
        box-shadow: 0 0 28px rgba(101, 228, 255, 0.08);
      }

      .demo-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
      }

      .demo-tile {
        min-height: 176px;
        padding: 18px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: linear-gradient(180deg, rgba(18, 25, 40, 0.92), rgba(10, 14, 24, 0.92));
        color: inherit;
        text-decoration: none;
      }

      .demo-tile:hover {
        border-color: rgba(101, 228, 255, 0.42);
      }

      .demo-tile strong,
      .demo-tile span {
        display: block;
      }

      .demo-kicker {
        margin-bottom: 16px;
        color: var(--accent);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .demo-tile strong {
        margin-bottom: 12px;
        font-size: 19px;
      }

      .demo-tile span {
        color: var(--muted);
        font-size: 14px;
        line-height: 1.55;
      }

      .docs {
        display: grid;
        grid-template-columns: minmax(0, 0.75fr) minmax(0, 1.25fr);
        gap: 18px;
        margin-top: 14px;
        padding: 22px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: rgba(7, 11, 20, 0.72);
      }

      .docs-intro p:not(.eyebrow) {
        margin-top: 14px;
        color: var(--muted);
        font-size: 15px;
        line-height: 1.6;
      }

      .doc-list {
        display: grid;
        gap: 10px;
      }

      .doc-card {
        padding: 14px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: var(--surface);
      }

      .doc-card strong {
        display: block;
        margin-bottom: 8px;
      }

      .doc-card p {
        color: var(--muted);
        font-size: 14px;
        line-height: 1.55;
      }

      .runtime-strip {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
        margin-top: 12px;
      }

      .runtime-strip div {
        min-height: 86px;
        padding: 14px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: rgba(101, 228, 255, 0.06);
      }

      .runtime-strip span,
      .runtime-strip strong {
        display: block;
      }

      .runtime-strip span {
        margin-bottom: 8px;
        color: var(--dim);
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
      }

      .runtime-strip strong {
        font-size: 15px;
      }

      nav {
        display: flex;
        gap: 8px;
        margin-bottom: 18px;
      }

      nav a {
        display: inline-flex;
        align-items: center;
        min-height: 34px;
        padding: 0 11px;
        border: 1px solid var(--line);
        border-radius: 6px;
        background: rgba(15, 21, 34, 0.66);
        color: var(--muted);
        font-size: 14px;
        text-decoration: none;
      }

      nav a.active {
        background: rgba(101, 228, 255, 0.12);
        color: var(--text);
        border-color: rgba(101, 228, 255, 0.42);
      }

      .composer {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 10px;
        margin-bottom: 18px;
      }

      input,
      button {
        height: 42px;
        border: 1px solid var(--line);
        border-radius: 6px;
        font: inherit;
      }

      input {
        min-width: 0;
        padding: 0 12px;
        background: var(--surface);
        color: var(--text);
      }

      button {
        padding: 0 14px;
        background: rgba(101, 228, 255, 0.12);
        color: var(--text);
        cursor: pointer;
      }

      button.secondary {
        background: rgba(148, 163, 184, 0.08);
        color: var(--text);
      }

      button.danger {
        background: rgba(251, 113, 133, 0.08);
        color: var(--danger);
      }

      ul {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 8px;
      }

      li {
        display: grid;
        grid-template-columns: 1fr auto auto;
        align-items: center;
        gap: 8px;
        min-height: 54px;
        padding: 8px 10px 8px 14px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: var(--surface);
      }

      .title {
        min-width: 0;
        overflow-wrap: anywhere;
      }

      .done .title {
        color: var(--dim);
        text-decoration: line-through;
      }

      form {
        margin: 0;
      }

      .stats {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
      }

      .metric {
        min-height: 88px;
        padding: 14px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: var(--surface);
      }

      .metric strong {
        display: block;
        margin-bottom: 8px;
        color: var(--muted);
        font-size: 13px;
        font-weight: 600;
      }

      .metric span {
        font-size: 28px;
        line-height: 1;
      }

      progress {
        width: 100%;
        height: 12px;
        margin-top: 12px;
        accent-color: var(--accent);
      }

      @media (max-width: 760px) {
        main {
          width: min(100% - 20px, 720px);
          padding: 28px 0;
        }

        header,
        .hero,
        .demo-grid,
        .docs,
        .runtime-strip,
        .composer,
        li,
        .stats {
          grid-template-columns: 1fr;
          align-items: stretch;
        }

        header {
          display: grid;
        }

        .count {
          white-space: normal;
          text-align: left;
        }

        h2 {
          font-size: 44px;
        }
      }
    </style>
  </head>
  <body>
    <main id="app">
      <header>
        <div>
          <p class="eyebrow">ts-zero demo lab</p>
          <h1>${page === "landing" ? "ts-zero landing" : "Todo demo"}</h1>
        </div>
        <div class="count">${page === "landing" ? "SSR, client navigation, stores, mutations, native runtime" : `${remaining} open / ${todos.length} total`}</div>
      </header>

      ${renderNavigation(page)}
      ${renderContent(page, todos)}
    </main>
    <script id="initial-state" type="application/json">${snapshot}</script>
    <script type="module" src="${escapeHtml(clientEntry)}"></script>
  </body>
</html>`;
}

function renderTodo(todo: Todo): string {
  const toggleLabel = todo.completed ? "Reopen" : "Done";

  return `<li class="${todo.completed ? "done" : ""}">
  <span class="title">${escapeHtml(todo.title)}</span>
  <form method="post" action="${router.path("todos.toggle", { id: todo.id })}">
    <button class="secondary" type="submit">${toggleLabel}</button>
  </form>
  <form method="post" action="${router.path("todos.delete", { id: todo.id })}">
    <button class="danger" type="submit">Delete</button>
  </form>
</li>`;
}

function renderNavigation(page: Page): string {
  return `<nav aria-label="Demo navigation">
  <a class="${page === "landing" ? "active" : ""}" href="${router.path("home")}">Overview</a>
  <a class="${page === "todos" ? "active" : ""}" href="${router.path("todos")}">Todos</a>
  <a class="${page === "stats" ? "active" : ""}" href="${router.path("stats")}">Stats</a>
</nav>`;
}

function renderContent(page: Page, todos: readonly Todo[]): string {
  if (page === "landing") {
    return renderLandingContent();
  }

  if (page === "stats") {
    return renderStatsContent(todos);
  }

  return renderTodosContent(todos);
}

function renderLandingContent(): string {
  return `<section class="hero" aria-labelledby="landing-title">
  <div>
    <p class="eyebrow">zero dependency primitives</p>
    <h2 id="landing-title">Small packages for a serious full-stack runtime.</h2>
    <p>A dark little lab for SSR, client takeover, immutable state, compact mutations, native runtime experiments and deployable web standards.</p>
  </div>
  <a class="primary-link" href="${router.path("todos")}">Open todo demo</a>
</section>

<section class="demo-grid" aria-label="Available demos">
  <a class="demo-tile" href="${router.path("todos")}">
    <span class="demo-kicker">interactive</span>
    <strong>Todo app</strong>
    <span>SSR first load, Solid client takeover, SQLite persistence and compact mutation acks.</span>
  </a>
  <a class="demo-tile" href="${router.path("stats")}">
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
    <p>The landing is intentionally small, but it is wired like a deployable product: server-rendered HTML first, a bundled client after, and explicit transport contracts.</p>
  </div>
  <div class="doc-list">
    <article class="doc-card">
      <strong>Web rendering</strong>
      <p>Initial requests return HTML from @ts-zero/http; navigation is then handled in the client without a page reload.</p>
    </article>
    <article class="doc-card">
      <strong>State and mutations</strong>
      <p>@ts-zero/store keeps immutable snapshots, while @ts-zero/mutation sends compact action acknowledgements.</p>
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
</section>`;
}

function renderTodosContent(todos: readonly Todo[]): string {
  return `<form class="composer" method="post" action="${router.path("todos.create")}">
  <input name="title" autocomplete="off" maxlength="120" placeholder="Add a task" required>
  <button type="submit">Add</button>
</form>

<ul>
  ${todos.map(renderTodo).join("")}
</ul>`;
}

function renderStatsContent(todos: readonly Todo[]): string {
  const completed = todos.filter((todo) => todo.completed).length;
  const remaining = todos.length - completed;
  const progress = todos.length === 0 ? 0 : Math.round((completed / todos.length) * 100);

  return `<section class="stats" aria-label="Todo stats">
  <div class="metric"><strong>Total</strong><span>${todos.length}</span></div>
  <div class="metric"><strong>Open</strong><span>${remaining}</span></div>
  <div class="metric"><strong>Done</strong><span>${completed}</span></div>
</section>
<div class="metric" style="margin-top: 10px;">
  <strong>Progress</strong>
  <span>${progress}%</span>
  <progress value="${completed}" max="${Math.max(todos.length, 1)}"></progress>
</div>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function javascript(body: string): Response {
  return new Response(body, {
    headers: {
      "content-type": "text/javascript; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function staticAsset(body: BodyInit, contentType: string): Response {
  return new Response(body, {
    headers: {
      "content-type": contentType,
      "cache-control": "no-store",
    },
  });
}

function safeAssetFile(file: string): URL | null {
  if (file.includes("/") || file.includes("\\") || file.includes("..")) {
    return null;
  }

  return new URL(`assets/${file}`, publicDirectory);
}

function contentTypeFor(pathname: string): string {
  if (pathname.endsWith(".css")) {
    return "text/css; charset=utf-8";
  }

  if (pathname.endsWith(".map")) {
    return "application/json; charset=utf-8";
  }

  return "text/javascript; charset=utf-8";
}
