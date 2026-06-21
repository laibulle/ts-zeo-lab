import { createApp, html, redirect } from "@ts-zero/http";
import { defineRoutes } from "@ts-zero/router";
import { createStore } from "@ts-zero/store/create";
import { v7 } from "@ts-zero/uuid/v7";

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
    <main>
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
