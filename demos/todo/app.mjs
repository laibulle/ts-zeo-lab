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
  ["@ts-zero/html/mount.js", new URL("../../packages/html/dist/mount.js", import.meta.url)],
  ["@ts-zero/html/types.js", new URL("../../packages/html/dist/types.js", import.meta.url)],
  ["@ts-zero/store/create.js", new URL("../../packages/store/dist/create.js", import.meta.url)],
  ["@ts-zero/store/errors.js", new URL("../../packages/store/dist/errors.js", import.meta.url)],
  ["@ts-zero/store/freeze.js", new URL("../../packages/store/dist/freeze.js", import.meta.url)],
  ["@ts-zero/store/snapshot.js", new URL("../../packages/store/dist/snapshot.js", import.meta.url)],
  ["@ts-zero/store/types.js", new URL("../../packages/store/dist/types.js", import.meta.url)],
]);

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
    createTodo: (state, title, context) => ({
      ...state,
      todos: [
        {
          id: context.id(),
          title,
          completed: false,
        },
        ...state.todos,
      ],
    }),
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
  return html(renderPage());
}

function renderClientModule() {
  return javascript(renderClientScript());
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

function renderPage() {
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

      @media (max-width: 560px) {
        main {
          width: min(100% - 20px, 720px);
          padding: 28px 0;
        }

        header,
        .composer,
        li {
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

      <form class="composer" method="post" action="${router.path("todos.create")}">
        <input name="title" autocomplete="off" maxlength="120" placeholder="Add a task" required>
        <button type="submit">Add</button>
      </form>

      <ul>
        ${todos.map(renderTodo).join("")}
      </ul>
    </main>
    <script id="initial-state" type="application/json">${snapshot}</script>
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

function renderClientScript() {
  return `import { formAction } from "/modules/@ts-zero/html/actions.js";
import { list, select } from "/modules/@ts-zero/html/bindings.js";
import { h, text } from "/modules/@ts-zero/html/elements.js";
import { mount } from "/modules/@ts-zero/html/mount.js";
import { createStore } from "/modules/@ts-zero/store/create.js";

const initial = JSON.parse(document.getElementById("initial-state").textContent);

const store = createStore({
  freeze: true,
  state: initial.state,
  version: initial.version,
  context: {
    id: () => crypto.randomUUID(),
  },
  transitions: {
    createTodo: (state, title, context) => ({
      ...state,
      todos: [
        {
          id: context.id(),
          title,
          completed: false,
        },
        ...state.todos,
      ],
    }),
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

mount(document.getElementById("app"), renderApp());

function renderApp() {
  return [
    h("header", null,
      h("h1", null, "ts-zero todo"),
      select(store, (state) => {
        const remaining = state.todos.filter((todo) => !todo.completed).length;
        return \`\${remaining} open / \${state.todos.length} total\`;
      }, (label) => h("div", { class: "count" }, label)),
    ),
    h("form", {
      class: "composer",
      method: "post",
      action: "${router.path("todos.create")}",
      onSubmit: withServerPost(formAction(store, "createTodo", (_form, data) => String(data.get("title") ?? "").trim()), (form) => {
        form.reset();
      }),
    },
      h("input", { name: "title", autocomplete: "off", maxlength: 120, placeholder: "Add a task", required: true }),
      h("button", { type: "submit" }, "Add"),
    ),
    h("ul", null,
      list(
        store,
        (state) => state.todos,
        (todo) => todo.id,
        renderTodo,
      ),
    ),
  ];
}

function renderTodo(todo) {
  return h("li", { class: todo.completed ? "done" : "" },
    h("span", { class: "title" }, todo.title),
    h("form", {
      method: "post",
      action: \`/todos/\${encodeURIComponent(todo.id)}/toggle\`,
      onSubmit: withServerPost((event) => {
        event.preventDefault();
        store.dispatch("toggleTodo", todo.id);
      }),
    },
      h("button", { class: "secondary", type: "submit" }, todo.completed ? "Reopen" : "Done"),
    ),
    h("form", {
      method: "post",
      action: \`/todos/\${encodeURIComponent(todo.id)}/delete\`,
      onSubmit: withServerPost((event) => {
        event.preventDefault();
        store.dispatch("deleteTodo", todo.id);
      }),
    },
      h("button", { class: "danger", type: "submit" }, "Delete"),
    ),
  );
}

function withServerPost(handler, afterDispatch = () => undefined) {
  return (event) => {
    handler(event);

    if (event.defaultPrevented !== true) {
      return;
    }

    const form = event.currentTarget;
    const body = new URLSearchParams(new FormData(form));
    fetch(form.action, {
      method: "POST",
      body,
    }).catch(() => undefined);
    afterDispatch(form);
  };
}
`;
}
