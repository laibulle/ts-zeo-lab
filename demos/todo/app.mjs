import { readFile } from "node:fs/promises";

import { createApp, html, redirect, text } from "@ts-zero/http";
import { defineRoutes } from "@ts-zero/router";
import { createStore } from "@ts-zero/store/create";
import { v7 } from "@ts-zero/uuid/v7";

const moduleFiles = new Map([
  ["@ts-zero/html/actions.js", new URL("../../packages/html/dist/actions.js", import.meta.url)],
  ["@ts-zero/html/bindings.js", new URL("../../packages/html/dist/bindings.js", import.meta.url)],
  ["@ts-zero/html/elements.js", new URL("../../packages/html/dist/elements.js", import.meta.url)],
  ["@ts-zero/html/errors.js", new URL("../../packages/html/dist/errors.js", import.meta.url)],
  ["@ts-zero/html/jsx-runtime.js", new URL("../../packages/html/dist/jsx-runtime.js", import.meta.url)],
  ["@ts-zero/html/mount.js", new URL("../../packages/html/dist/mount.js", import.meta.url)],
  ["@ts-zero/html/types.js", new URL("../../packages/html/dist/types.js", import.meta.url)],
  ["@ts-zero/store/create.js", new URL("../../packages/store/dist/create.js", import.meta.url)],
  ["@ts-zero/store/errors.js", new URL("../../packages/store/dist/errors.js", import.meta.url)],
  ["@ts-zero/store/freeze.js", new URL("../../packages/store/dist/freeze.js", import.meta.url)],
  ["@ts-zero/store/snapshot.js", new URL("../../packages/store/dist/snapshot.js", import.meta.url)],
  ["@ts-zero/store/types.js", new URL("../../packages/store/dist/types.js", import.meta.url)],
]);

const clientFile = new URL("./dist/pages/client.js", import.meta.url);

const store = createStore({
  freeze: true,
  state: {
    todos: [
      {
        id: v7(),
        title: "Faire tourner @ts-zero/http",
        completed: true,
      },
      {
        id: v7(),
        title: "Imaginer le protocole live",
        completed: false,
      },
    ],
  },
  context: {
    id: v7,
  },
  transitions: {
    createTodo: (state, title, context) => {
      if (typeof title !== "string" || title.length === 0) {
        return state;
      }

      return {
        ...state,
        todos: [
          {
            id: context.id(),
            title,
            completed: false,
          },
          ...state.todos,
        ],
      };
    },
    toggleTodo: (state, id) => ({
      ...state,
      todos: state.todos.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)),
    }),
    deleteTodo: (state, id) => ({
      ...state,
      todos: state.todos.filter((todo) => todo.id !== id),
    }),
  },
});

export const app = createApp();

export const router = defineRoutes((r) => {
  r.pipeline("browser", []);

  r.scope("/", { pipe: "browser" }, (r) => {
    r.get("home", "/", renderHome);
    r.get("stats", "/stats", renderStats);
    r.get("client", "/client.mjs", renderClientModule);
    r.get("html.module", "/modules/@ts-zero/html/:file", serveHtmlModule);
    r.get("store.module", "/modules/@ts-zero/store/:file", serveStoreModule);
    r.scope("/todos", (r) => {
      r.post("todos.create", "/", createTodo);
      r.post("todos.toggle", "/:id/toggle", toggleTodo);
      r.post("todos.delete", "/:id/delete", deleteTodo);
    });
  });
});

mountRoutes(app, router);

function mountRoutes(app, router) {
  for (const route of router.routes) {
    app.route(route.method, route.path, route.handler);
  }
}

function renderHome() {
  return html(renderPage("todos"));
}

function renderStats() {
  return html(renderPage("stats"));
}

async function renderClientModule() {
  return javascript(await readFile(clientFile, "utf8"));
}

async function serveHtmlModule({ params }) {
  return serveModule(`@ts-zero/html/${params.file}`);
}

async function serveStoreModule({ params }) {
  return serveModule(`@ts-zero/store/${params.file}`);
}

async function createTodo({ request }) {
  const form = await readForm(request);
  const title = form.get("title")?.trim();

  if (title !== undefined && title.length > 0) {
    store.dispatch("createTodo", title);
  }

  return redirect(router.path("home"));
}

function toggleTodo({ params }) {
  store.dispatch("toggleTodo", params.id);

  return redirect(router.path("home"));
}

function deleteTodo({ params }) {
  store.dispatch("deleteTodo", params.id);

  return redirect(router.path("home"));
}

async function readForm(request) {
  const body = await request.text();
  return new URLSearchParams(body);
}

function renderPage(page) {
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
    <script type="importmap">${renderImportMap()}</script>
    <script type="module" src="/client.mjs"></script>
  </body>
</html>`;
}

function renderTodo(todo) {
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

function renderNavigation(page) {
  return `<nav aria-label="Todo navigation">
  <a class="${page === "todos" ? "active" : ""}" href="${router.path("home")}">Todos</a>
  <a class="${page === "stats" ? "active" : ""}" href="${router.path("stats")}">Stats</a>
</nav>`;
}

function renderTodosContent(todos) {
  return `<form class="composer" method="post" action="${router.path("todos.create")}">
  <input name="title" autocomplete="off" maxlength="120" placeholder="Add a task" required>
  <button type="submit">Add</button>
</form>

<ul>
  ${todos.map(renderTodo).join("")}
</ul>`;
}

function renderStatsContent(todos) {
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

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function serveModule(specifier) {
  const file = moduleFiles.get(specifier);

  if (file === undefined) {
    return text("Not Found", { status: 404 });
  }

  return javascript(await readFile(file, "utf8"));
}

function javascript(body) {
  return new Response(body, {
    headers: {
      "content-type": "text/javascript; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function renderImportMap() {
  return JSON.stringify({
    imports: {
      "@ts-zero/html/actions": "/modules/@ts-zero/html/actions.js",
      "@ts-zero/html/bindings": "/modules/@ts-zero/html/bindings.js",
      "@ts-zero/html/elements": "/modules/@ts-zero/html/elements.js",
      "@ts-zero/html/jsx-runtime": "/modules/@ts-zero/html/jsx-runtime.js",
      "@ts-zero/html/mount": "/modules/@ts-zero/html/mount.js",
      "@ts-zero/store/create": "/modules/@ts-zero/store/create.js",
    },
  });
}
