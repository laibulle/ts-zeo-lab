import { createStore } from "@ts-zero/store/create";
import type { CreateTodoPayload, Snapshot, TodoContext, TodoState, TodoStore } from "./types.js";

export function createTodoStore(snapshot: Snapshot): TodoStore {
  return createStore<TodoState, TodoContext>({
    freeze: true,
    state: snapshot.state,
    version: snapshot.version,
    context: {
      id: () => crypto.randomUUID(),
    },
    transitions: {
      createTodo: (state, payload: unknown, context) => {
        const todo = normalizeCreateTodoPayload(payload, context.id);

        if (todo === null) {
          return state;
        }

        return {
          ...state,
          todos: [
            todo,
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

export function createTodoPayload(title: string, id: string = crypto.randomUUID()): CreateTodoPayload | null {
  const trimmed = title.trim();

  if (trimmed.length === 0 || trimmed.length > 120) {
    return null;
  }

  return {
    id,
    title: trimmed,
  };
}

function normalizeCreateTodoPayload(payload: unknown, fallbackId: () => string): TodoState["todos"][number] | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const candidate = payload as Partial<CreateTodoPayload>;
  const normalized = createTodoPayload(String(candidate.title ?? ""), candidate.id ?? fallbackId());

  if (normalized === null) {
    return null;
  }

  return {
    ...normalized,
    completed: false,
  };
}

export function selectTodoCountLabel(state: TodoState): string {
  const remaining = state.todos.filter((todo) => !todo.completed).length;
  return `${remaining} open / ${state.todos.length} total`;
}

export function selectStats(state: TodoState): {
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
