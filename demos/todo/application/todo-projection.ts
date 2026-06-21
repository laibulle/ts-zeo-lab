import { createStore } from "@ts-zero/store/create";
import type { Store } from "@ts-zero/store";
import { createTodoEntity, type Todo } from "../domain/todo.js";

export interface TodoProjectionState {
  readonly todos: readonly Todo[];
}

export function createTodoProjection({ todos }: { readonly todos: readonly Todo[] }): Store<TodoProjectionState> {
  return createStore({
    freeze: true,
    state: {
      todos,
    },
    transitions: {
      createTodo: (state, payload: unknown) => {
        const todo = createTodoEntity(payload ?? {});

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
