import { readFile } from "node:fs/promises";

import { createApp, html, json, redirect, text } from "@ts-zero/http";
import { defineRoutes } from "@ts-zero/router";
import type { App, Context, Handler, HttpMethod } from "@ts-zero/http";
import type { Router } from "@ts-zero/router";
import type { HostMessage, RuntimeMessage, Serializable } from "@ts-zero/runtime/types";
import { validate } from "@ts-zero/uuid/format";
import { v7 } from "@ts-zero/uuid/v7";
import { createTodoProjection } from "../../application/todo-projection.js";
import { createTodoUseCases } from "../../application/todo-use-cases.js";
import type { Todo } from "../../domain/todo.js";
import { openSqliteTodoRepository } from "../../infrastructure/sqlite-todo-repository.js";

type Page = "todos" | "stats";

const clientFile = new URL("../public/client.mjs", import.meta.url);
const publicDirectory = new URL("../public/", import.meta.url);
const clientEntry = process.env.TODO_CLIENT_ENTRY ?? "/client.mjs";
const todoRepository = await openSqliteTodoRepository();
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
    r.get("stats", "/stats", renderStats);
    r.get("client", "/client.mjs", renderClientModule);
    r.get("client.asset", "/assets/:file", serveClientAsset);
    r.post("runtime", "/runtime", handleRuntimeMessage);
    r.scope("/todos", (r) => {
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

  return redirect(router.path("home"));
}

function toggleTodo({ params }: Context): Response {
  if (todoUseCases.toggleTodo({ id: params.id })) {
    store.dispatch("toggleTodo", params.id);
  }

  return redirect(router.path("home"));
}

function deleteTodo({ params }: Context): Response {
  if (todoUseCases.deleteTodo({ id: params.id })) {
    store.dispatch("deleteTodo", params.id);
  }

  return redirect(router.path("home"));
}

async function handleRuntimeMessage({ request }: Context): Promise<Response> {
  const message = await request.json() as RuntimeMessage;

  if (message.kind !== "request" || message.capability !== "todo") {
    return json(runtimeError(message, "Unsupported runtime message"), { status: 400 });
  }

  const snapshot = dispatchTodoRuntimeOperation(message.operation, message.payload);

  return json({
    kind: "response",
    id: message.id,
    ok: true,
    value: snapshot as unknown as Serializable,
  } satisfies HostMessage);
}

function dispatchTodoRuntimeOperation(operation: string, payload: Serializable | undefined): ReturnType<typeof store.snapshot> {
  if (operation === "create") {
    const command = asRecord(payload);
    const todo = todoUseCases.createTodo({
      id: command.id,
      title: command.title,
    });

    if (todo !== null) {
      store.dispatch("createTodo", todo);
    }

    return store.snapshot();
  }

  if (operation === "toggle") {
    const command = asRecord(payload);

    if (todoUseCases.toggleTodo({ id: command.id })) {
      store.dispatch("toggleTodo", command.id);
    }

    return store.snapshot();
  }

  if (operation === "delete") {
    const command = asRecord(payload);

    if (todoUseCases.deleteTodo({ id: command.id })) {
      store.dispatch("deleteTodo", command.id);
    }

    return store.snapshot();
  }

  return store.snapshot();
}

function asRecord(value: Serializable | undefined): Record<string, Serializable | undefined> {
  if (value === null || value === undefined || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, Serializable | undefined>;
}

function runtimeError(message: RuntimeMessage, reason: string): HostMessage {
  return {
    kind: "response",
    id: message.kind === "request" ? message.id : "unknown",
    ok: false,
    error: reason,
  };
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
    <title>ts-zero todo</title>
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
        width: min(720px, calc(100% - 32px));
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

      .count {
        color: #65707d;
        font-size: 14px;
        white-space: nowrap;
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
        <h1>ts-zero todo</h1>
        <div class="count">${remaining} open / ${todos.length} total</div>
      </header>

      ${renderNavigation(page)}
      ${page === "stats" ? renderStatsContent(todos) : renderTodosContent(todos)}
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
  return `<nav aria-label="Todo navigation">
  <a class="${page === "todos" ? "active" : ""}" href="${router.path("home")}">Todos</a>
  <a class="${page === "stats" ? "active" : ""}" href="${router.path("stats")}">Stats</a>
</nav>`;
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
