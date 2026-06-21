import type { TodoRepository } from "../application/todo-use-cases.js";
import { createMemoryTodoRepository } from "./memory-todo-repository.js";
import { openSqliteTodoRepository } from "./sqlite-todo-repository.js";

export async function openTodoRepository(mode = process.env.TODO_REPOSITORY ?? "sqlite"): Promise<TodoRepository> {
  if (mode === "memory") {
    return createMemoryTodoRepository();
  }

  if (mode === "sqlite") {
    return openSqliteTodoRepository();
  }

  throw new Error(`Unsupported TODO_REPOSITORY mode: ${mode}`);
}
