/** @jsxImportSource @ts-zero/html */
import { formAction } from "@ts-zero/html/actions";
import { list, select } from "@ts-zero/html/bindings";
import { mount } from "@ts-zero/html/mount";
import { createStore } from "@ts-zero/store/create";
import type { HtmlChild, Store } from "@ts-zero/html/types";

interface Todo {
  readonly id: string;
  readonly title: string;
  readonly completed: boolean;
}

interface TodoState {
  readonly todos: readonly Todo[];
}

type Page = "todos" | "stats";

interface UiState {
  readonly page: Page;
}

interface Snapshot {
  readonly version: number;
  readonly state: TodoState;
}

interface Routes {
  readonly createTodo: string;
  readonly home: string;
  readonly stats: string;
  readonly toggleTodo: (id: string) => string;
  readonly deleteTodo: (id: string) => string;
}

interface TodoContext {
  readonly id: () => string;
  readonly [key: string]: unknown;
}

const routes: Routes = {
  createTodo: "/todos/",
  home: "/",
  stats: "/stats",
  toggleTodo: (id) => `/todos/${encodeURIComponent(id)}/toggle`,
  deleteTodo: (id) => `/todos/${encodeURIComponent(id)}/delete`,
};

const initialState = document.getElementById("initial-state");

if (initialState === null || initialState.textContent === null) {
  throw new Error("Missing initial todo state");
}

const initial = JSON.parse(initialState.textContent) as Snapshot;
const store = createTodoStore(initial);
const uiStore = createUiStore(getPageFromLocation(routes));
const target = document.getElementById("app");

if (target === null) {
  throw new Error("Missing app target");
}

addEventListener("popstate", () => {
  uiStore.dispatch("navigate", getPageFromLocation(routes));
});

mount(target, <TodoApp store={store} uiStore={uiStore} routes={routes} />);

function TodoApp({
  store,
  uiStore,
  routes,
}: {
  readonly store: Store<TodoState>;
  readonly uiStore: Store<UiState>;
  readonly routes: Routes;
}): HtmlChild {
  return (
    <>
      <TodoHeader store={store} />
      {select(uiStore, (state) => state.page, (page) => (
        <>
          <TodoNavigation page={page} uiStore={uiStore} routes={routes} />
          {page === "stats"
            ? <TodoStats store={store} />
            : <TodoPage store={store} routes={routes} />}
        </>
      ))}
    </>
  );
}

function TodoNavigation({
  page,
  uiStore,
  routes,
}: {
  readonly page: Page;
  readonly uiStore: Store<UiState>;
  readonly routes: Routes;
}): HtmlChild {
  return (
    <nav aria-label="Todo navigation">
      <a class={page === "todos" ? "active" : ""} href={routes.home} onClick={navigateTo(uiStore, "todos", routes.home)}>
        Todos
      </a>
      <a class={page === "stats" ? "active" : ""} href={routes.stats} onClick={navigateTo(uiStore, "stats", routes.stats)}>
        Stats
      </a>
    </nav>
  );
}

function TodoPage({ store, routes }: { readonly store: Store<TodoState>; readonly routes: Routes }): HtmlChild {
  return (
    <>
      <TodoComposer store={store} action={routes.createTodo} />
      <TodoList store={store} routes={routes} />
    </>
  );
}

function TodoHeader({ store }: { readonly store: Store<TodoState> }): HtmlChild {
  return (
    <header>
      <h1>ts-zero todo</h1>
      {select(store, selectTodoCountLabel, (label) => <div class="count">{label}</div>)}
    </header>
  );
}

function TodoComposer({ store, action }: { readonly store: Store<TodoState>; readonly action: string }): HtmlChild {
  return (
    <form
      class="composer"
      method="post"
      action={action}
      onSubmit={withServerPost(
        formAction(store, "createTodo", (_form, data) => String(data.get("title") ?? "").trim()),
        (form) => {
          form.reset();
        },
      )}
    >
      <input name="title" autocomplete="off" maxlength={120} placeholder="Add a task" required />
      <button type="submit">Add</button>
    </form>
  );
}

function TodoStats({ store }: { readonly store: Store<TodoState> }): HtmlChild {
  return select(store, selectStats, (stats) => (
    <>
      <section class="stats" aria-label="Todo stats">
        <div class="metric"><strong>Total</strong><span>{stats.total}</span></div>
        <div class="metric"><strong>Open</strong><span>{stats.remaining}</span></div>
        <div class="metric"><strong>Done</strong><span>{stats.completed}</span></div>
      </section>
      <div class="metric" style="margin-top: 10px;">
        <strong>Progress</strong>
        <span>{stats.progress}%</span>
        <progress value={stats.completed} max={Math.max(stats.total, 1)} />
      </div>
    </>
  ));
}

function TodoList({ store, routes }: { readonly store: Store<TodoState>; readonly routes: Routes }): HtmlChild {
  return (
    <ul>
      {list(
        store,
        (state) => state.todos,
        (todo) => todo.id,
        (todo) => <TodoItem store={store} routes={routes} todo={todo} />,
      )}
    </ul>
  );
}

function TodoItem({
  store,
  routes,
  todo,
}: {
  readonly store: Store<TodoState>;
  readonly routes: Routes;
  readonly todo: Todo;
}): HtmlChild {
  return (
    <li class={todo.completed ? "done" : ""}>
      <span class="title">{todo.title}</span>
      <form
        method="post"
        action={routes.toggleTodo(todo.id)}
        onSubmit={withServerPost((event) => {
          event.preventDefault();
          store.dispatch("toggleTodo", todo.id);
        })}
      >
        <button class="secondary" type="submit">{todo.completed ? "Reopen" : "Done"}</button>
      </form>
      <form
        method="post"
        action={routes.deleteTodo(todo.id)}
        onSubmit={withServerPost((event) => {
          event.preventDefault();
          store.dispatch("deleteTodo", todo.id);
        })}
      >
        <button class="danger" type="submit">Delete</button>
      </form>
    </li>
  );
}

function createTodoStore(snapshot: Snapshot): Store<TodoState> {
  return createStore<TodoState, TodoContext>({
    freeze: true,
    state: snapshot.state,
    version: snapshot.version,
    context: {
      id: () => crypto.randomUUID(),
    },
    transitions: {
      createTodo: (state, title: unknown, context) => {
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
      toggleTodo: (state, id: unknown) => ({
        ...state,
        todos: state.todos.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)),
      }),
      deleteTodo: (state, id: unknown) => ({
        ...state,
        todos: state.todos.filter((todo) => todo.id !== id),
      }),
    },
  });
}

function createUiStore(page: Page): Store<UiState> {
  return createStore({
    state: { page },
    transitions: {
      navigate: (_state, nextPage: unknown) => {
        if (nextPage !== "todos" && nextPage !== "stats") {
          return _state;
        }

        return { page: nextPage };
      },
    },
  });
}

function getPageFromLocation(routes: Routes): Page {
  return location.pathname === routes.stats ? "stats" : "todos";
}

function navigateTo(uiStore: Store<UiState>, page: Page, path: string): (event: MouseEvent) => void {
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

function selectTodoCountLabel(state: TodoState): string {
  const remaining = state.todos.filter((todo) => !todo.completed).length;
  return `${remaining} open / ${state.todos.length} total`;
}

function selectStats(state: TodoState): {
  readonly total: number;
  readonly remaining: number;
  readonly completed: number;
  readonly progress: number;
} {
  const completed = state.todos.filter((todo) => todo.completed).length;
  const total = state.todos.length;
  const remaining = total - completed;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

  return {
    total,
    remaining,
    completed,
    progress,
  };
}

function withServerPost(
  handler: (event: SubmitEvent) => void,
  afterDispatch: (form: HTMLFormElement) => void = () => undefined,
): (event: SubmitEvent) => void {
  return (event) => {
    handler(event);

    if (event.defaultPrevented !== true) {
      return;
    }

    const form = event.currentTarget;

    if (!(form instanceof HTMLFormElement)) {
      throw new Error("Expected submit event target to be a form");
    }

    const body = new URLSearchParams(new FormData(form) as unknown as URLSearchParams);
    fetch(form.action, {
      method: "POST",
      body,
    }).catch(() => undefined);
    afterDispatch(form);
  };
}
