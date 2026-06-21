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
        color-scheme: light;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #f6f7f9;
        color: #17191c;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
      }

      main {
        width: min(920px, calc(100% - 32px));
        margin: 0 auto;
        padding: 56px 0;
      }

      header {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 24px;
        margin-bottom: 28px;
      }

      h1 {
        margin: 0;
        font-size: 32px;
        line-height: 1.1;
        letter-spacing: 0;
      }

      h2 {
        margin: 0;
        max-width: 720px;
        font-size: 46px;
        line-height: 1.02;
        letter-spacing: 0;
      }

      p {
        margin: 0;
      }

      .eyebrow {
        margin: 0 0 8px;
        color: #25636f;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .count {
        color: #65707d;
        font-size: 14px;
        white-space: nowrap;
      }

      .hero {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: end;
        gap: 28px;
        margin: 20px 0 26px;
        padding: 34px 0 8px;
        border-top: 1px solid #d8dde5;
      }

      .hero p:not(.eyebrow) {
        max-width: 660px;
        margin-top: 18px;
        color: #4b5563;
        font-size: 17px;
        line-height: 1.55;
      }

      .primary-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 42px;
        padding: 0 15px;
        border: 1px solid #1e293b;
        border-radius: 6px;
        background: #1e293b;
        color: #ffffff;
        font-size: 14px;
        font-weight: 700;
        text-decoration: none;
        white-space: nowrap;
      }

      .demo-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
      }

      .demo-tile {
        min-height: 156px;
        padding: 16px;
        border: 1px solid #e1e5eb;
        border-radius: 8px;
        background: #ffffff;
        color: inherit;
        text-decoration: none;
      }

      .demo-tile strong,
      .demo-tile span {
        display: block;
      }

      .demo-tile strong {
        margin-bottom: 12px;
        font-size: 17px;
      }

      .demo-tile span {
        color: #5f6b7a;
        font-size: 14px;
        line-height: 1.45;
      }

      nav {
        display: flex;
        gap: 8px;
        margin-bottom: 22px;
      }

      nav a {
        display: inline-flex;
        align-items: center;
        min-height: 34px;
        padding: 0 11px;
        border: 1px solid #d8dde5;
        border-radius: 6px;
        background: #ffffff;
        color: #1e293b;
        font-size: 14px;
        text-decoration: none;
      }

      nav a.active {
        background: #1e293b;
        color: #ffffff;
        border-color: #1e293b;
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
        border: 1px solid #d8dde5;
        border-radius: 6px;
        font: inherit;
      }

      input {
        min-width: 0;
        padding: 0 12px;
        background: #ffffff;
      }

      button {
        padding: 0 14px;
        background: #1e293b;
        color: #ffffff;
        cursor: pointer;
      }

      button.secondary {
        background: #ffffff;
        color: #1e293b;
      }

      button.danger {
        background: #ffffff;
        color: #9f1239;
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
        border: 1px solid #e1e5eb;
        border-radius: 8px;
        background: #ffffff;
      }

      .title {
        min-width: 0;
        overflow-wrap: anywhere;
      }

      .done .title {
        color: #79828e;
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
        border: 1px solid #e1e5eb;
        border-radius: 8px;
        background: #ffffff;
      }

      .metric strong {
        display: block;
        margin-bottom: 8px;
        color: #65707d;
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
      }

      @media (max-width: 560px) {
        main {
          width: min(100% - 20px, 720px);
          padding: 28px 0;
        }

        header,
        .hero,
        .demo-grid,
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
        }
      }
    </style>
  </head>
  <body>
    <main id="app">
      <header>
        <div>
          <p class="eyebrow">ts-zero demo lab</p>
          <h1>${page === "landing" ? "A tiny full-stack platform, in pieces" : "Todo demo"}</h1>
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
    <h2 id="landing-title">Build the framework surface from small, inspectable packages.</h2>
    <p>This demo is the playground for SSR, client takeover, immutable state, compact mutations, native runtime experiments and clean application boundaries.</p>
  </div>
  <a class="primary-link" href="${router.path("todos")}">Open todo demo</a>
</section>

<section class="demo-grid" aria-label="Available demos">
  <a class="demo-tile" href="${router.path("todos")}">
    <strong>Todo app</strong>
    <span>SSR first load, Solid client takeover, SQLite persistence and compact mutation acks.</span>
  </a>
  <a class="demo-tile" href="${router.path("stats")}">
    <strong>Live stats</strong>
    <span>Shared immutable store selectors rendered server-side and updated client-side.</span>
  </a>
  <div class="demo-tile">
    <strong>Native runtime</strong>
    <span>JavaScriptCore host events and native capabilities for the macOS prototype.</span>
  </div>
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
