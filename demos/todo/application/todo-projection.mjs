import { createStore } from "@ts-zero/store/create";
import { createTodoEntity } from "../domain/todo.mjs";

export function createTodoProjection({ todos }) {
  return createStore({
    freeze: true,
    state: {
      todos,
    },
    transitions: {
      createTodo: (state, payload) => {
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
}
