import { createStore } from "@ts-zero/store/create";
import type { Snapshot, TodoContext, TodoState, TodoStore } from "./types.js";

export function createTodoStore(snapshot: Snapshot): TodoStore {
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
