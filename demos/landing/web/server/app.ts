import { readFile } from "node:fs/promises";

import { createApp, html, json, redirect, text } from "@ts-zero/http";
import { defineRoutes } from "@ts-zero/router";
import { createStore } from "@ts-zero/store/create";
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
import type {
  CounterMutationActionResult,
  CounterMutationActionType,
  CounterRuntimeResult,
  CounterState,
  Page,
  TodoMutationActionResult,
  TodoMutationActionType,
  TodoMutationPayload,
  TodoRuntimeResult,
} from "../shared/types.js";

const clientFile = new URL("../public/client.mjs", import.meta.url);
const publicDirectory = new URL("../public/", import.meta.url);
const clientEntry = process.env.TODO_CLIENT_ENTRY ?? "/client.mjs";
const counterStreamsEnabled = process.env.COUNTER_STREAMS !== "0" && process.env.VERCEL !== "1";
const counterClients = new Set<ReadableStreamDefaultController<Uint8Array>>();
const textEncoder = new TextEncoder();
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
const counterStore = createStore<CounterState>({
  freeze: true,
  state: {
    value: 0,
  },
  transitions: {
    incrementCounter: (state, delta: unknown) => ({
      value: state.value + normalizeCounterDelta(delta),
    }),
    resetCounter: () => ({
      value: 0,
    }),
  },
});

export const app = createApp();

export const router = defineRoutes<Handler>((r) => {
  r.pipeline("browser", []);

  r.scope("/", { pipe: "browser" }, (r) => {
    r.get("home", "/", renderHome);
    r.get("counter", "/counter", renderCounter);
    r.get("todos", "/todos", renderTodos);
    r.get("stats", "/stats", renderStats);
    r.get("client", "/client.mjs", renderClientModule);
    r.get("client.asset", "/assets/:file", serveClientAsset);
    r.scope("/counter", (r) => {
      r.get("counter.events", "/events", handleCounterEvents);
      r.post("counter.actions", "/actions", handleCounterAction);
    });
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

function renderCounter(): Response {
  return html(renderPage("counter"));
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

async function handleCounterAction({ request }: Context): Promise<Response> {
  if (!isJsonRequest(request)) {
    const form = await readForm(request);
    const previousVersion = counterStore.version();

    if (form.get("delta") === "-1") {
      counterStore.dispatch("incrementCounter", -1);
      broadcastCounterResult(createActionResult(previousVersion, counterStore.version(), "incrementCounter", -1) as CounterMutationActionResult);
      return redirect(router.path("counter"));
    }

    if (form.get("delta") === "1") {
      counterStore.dispatch("incrementCounter", 1);
      broadcastCounterResult(createActionResult(previousVersion, counterStore.version(), "incrementCounter", 1) as CounterMutationActionResult);
      return redirect(router.path("counter"));
    }

    counterStore.dispatch("resetCounter", 0);
    broadcastCounterResult(createActionResult(previousVersion, counterStore.version(), "resetCounter", 0) as CounterMutationActionResult);
    return redirect(router.path("counter"));
  }

  return json(dispatchCounterMutation(await request.json()));
}

function handleCounterEvents(): Response {
  if (!counterStreamsEnabled) {
    return text("Counter streams are disabled in this runtime", { status: 409 });
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      counterClients.add(controller);
      controller.enqueue(encodeCounterEvent(createSnapshotResult(counterStore.snapshot())));
    },
    cancel() {
      // The controller is removed on the next failed enqueue if the stream is cancelled.
    },
  });

  return new Response(stream, {
    headers: {
      "cache-control": "no-store",
      "content-type": "text/event-stream; charset=utf-8",
      "x-accel-buffering": "no",
    },
  });
}

function dispatchCounterMutation(payload: unknown): CounterRuntimeResult {
  const request = getMutationRequest(payload);
  const previousVersion = counterStore.version();

  if (request.action.type === "increment") {
    const delta = normalizeCounterDelta(request.action.payload);
    counterStore.dispatch("incrementCounter", delta);
    return counterResult(previousVersion, "incrementCounter", delta, request.version);
  }

  if (request.action.type === "reset") {
    counterStore.dispatch("resetCounter", 0);
    return counterResult(previousVersion, "resetCounter", 0, request.version);
  }

  return counterSnapshotResult();
}

function counterResult(
  previousVersion: number,
  type: CounterMutationActionType,
  payload: number,
  requestVersion: number,
): CounterRuntimeResult {
  const result = requestVersion === previousVersion
    ? createActionResult(previousVersion, counterStore.version(), type, payload) as CounterMutationActionResult
    : counterSnapshotResult();

  if (counterStreamsEnabled && result.kind === "action") {
    broadcastCounterResult(result);
  }

  return result;
}

function counterSnapshotResult(): CounterRuntimeResult {
  return createSnapshotResult(counterStore.snapshot());
}

function broadcastCounterResult(result: CounterRuntimeResult): void {
  const message = encodeCounterEvent(result);

  for (const client of Array.from(counterClients)) {
    try {
      client.enqueue(message);
    } catch {
      counterClients.delete(client);
    }
  }
}

function encodeCounterEvent(result: CounterRuntimeResult): Uint8Array {
  return textEncoder.encode(`event: counter\ndata: ${JSON.stringify(result)}\n\n`);
}

function isJsonRequest(request: Request): boolean {
  return request.headers.get("content-type")?.includes("application/json") === true;
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
  const counterBootstrap = JSON.stringify({
    snapshot: counterStore.snapshot(),
    streams: counterStreamsEnabled,
  }).replaceAll("<", "\\u003c");

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
        grid-template-columns: repeat(4, minmax(0, 1fr));
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

      .counter-demo {
        display: grid;
        grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
        gap: 12px;
      }

      .counter-panel,
      .counter-flow,
      .transport-log {
        border: 1px solid var(--line);
        border-radius: 8px;
        background: var(--surface);
      }

      .counter-panel {
        min-height: 340px;
        padding: 22px;
      }

      .counter-value {
        margin: 22px 0 8px;
        font-size: 104px;
        font-weight: 800;
        line-height: 0.9;
      }

      .counter-version {
        color: var(--muted);
        font-size: 14px;
      }

      .counter-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 28px;
      }

      .counter-flow {
        display: grid;
        gap: 10px;
        padding: 14px;
      }

      .counter-flow div {
        display: grid;
        grid-template-columns: 32px minmax(0, 1fr);
        gap: 10px;
        padding: 14px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: rgba(5, 7, 13, 0.42);
      }

      .counter-flow span {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border: 1px solid rgba(101, 228, 255, 0.38);
        border-radius: 999px;
        color: var(--accent);
        font-size: 13px;
        font-weight: 700;
      }

      .counter-flow strong,
      .counter-flow p {
        grid-column: 2;
      }

      .counter-flow p {
        margin-top: -6px;
        color: var(--muted);
        font-size: 14px;
        line-height: 1.45;
      }

      .transport-log {
        grid-column: 1 / -1;
        padding: 16px;
      }

      .transport-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 10px;
      }

      .transport-heading span {
        color: var(--accent);
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
      }

      .transport-log p {
        padding: 9px 0;
        border-top: 1px solid var(--line);
        color: var(--muted);
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 13px;
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
        .counter-demo,
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

        .transport-log {
          grid-column: auto;
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
    <script id="initial-counter-state" type="application/json">${counterBootstrap}</script>
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
  <a class="${page === "counter" ? "active" : ""}" href="${router.path("counter")}">Counter</a>
  <a class="${page === "todos" ? "active" : ""}" href="${router.path("todos")}">Todos</a>
  <a class="${page === "stats" ? "active" : ""}" href="${router.path("stats")}">Stats</a>
</nav>`;
}

function renderContent(page: Page, todos: readonly Todo[]): string {
  if (page === "landing") {
    return renderLandingContent();
  }

  if (page === "counter") {
    return renderCounterContent();
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
  <a class="demo-tile" href="${router.path("counter")}">
    <span class="demo-kicker">distributed</span>
    <strong>Counter runtime</strong>
    <span>Versioned state, compact mutations and live SSE when hosted on a long-running runtime.</span>
  </a>
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

function renderCounterContent(): string {
  const { value } = counterStore.getState();
  const mode = counterStreamsEnabled ? "live runtime" : "serverless-safe";

  return `<section class="counter-demo" aria-label="Distributed counter">
  <div class="counter-panel">
    <p class="eyebrow">distributed state</p>
    <div class="counter-value">${value}</div>
    <div class="counter-version">server version ${counterStore.version()}</div>
    <div class="counter-actions">
      <form method="post" action="${router.path("counter.actions")}">
        <input type="hidden" name="delta" value="1">
        <button type="submit">+1</button>
      </form>
      <form method="post" action="${router.path("counter.actions")}">
        <input type="hidden" name="delta" value="-1">
        <button class="secondary" type="submit">-1</button>
      </form>
      <form method="post" action="${router.path("counter.actions")}">
        <button class="danger" type="submit">Reset</button>
      </form>
    </div>
  </div>
  <div class="counter-flow">
    <div><span>1</span><strong>Client action</strong><p>POST sends version + action.</p></div>
    <div><span>2</span><strong>Server state</strong><p>The server applies the action if the version is current.</p></div>
    <div><span>3</span><strong>${counterStreamsEnabled ? "Live patch" : "Replay result"}</strong><p>${counterStreamsEnabled ? "SSE broadcasts compact updates to peers." : "Serverless returns the protocol result to this request."}</p></div>
  </div>
  <div class="transport-log">
    <div class="transport-heading"><strong>Transport log</strong><span>${mode}</span></div>
    <p>${counterStreamsEnabled ? "SSE stream available in this runtime" : "Serverless mode: protocol replay without durable stream"}</p>
  </div>
</section>`;
}

function normalizeCounterDelta(delta: unknown): number {
  return delta === -1 ? -1 : 1;
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
