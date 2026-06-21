import type { TodoRepository } from "../application/todo-use-cases.js";
import type { Todo } from "../domain/todo.js";

export function createMemoryTodoRepository(initialTodos: readonly Todo[] = []): TodoRepository {
  const todos = new Map<string, Todo>();

  for (const todo of initialTodos) {
    todos.set(todo.id, todo);
  }

  return {
    listTodos() {
      return Array.from(todos.values()).reverse();
    },
    countTodos() {
      return todos.size;
    },
    createTodo(todo) {
      if (!todos.has(todo.id)) {
        todos.set(todo.id, todo);
      }
    },
    toggleTodo(id) {
      const todo = todos.get(id);

      if (todo !== undefined) {
        todos.set(id, { ...todo, completed: !todo.completed });
      }
    },
    deleteTodo(id) {
      todos.delete(id);
    },
    close() {},
  };
}
