import type { Store } from "@ts-zero/store";

export interface Todo {
  readonly id: string;
  readonly title: string;
  readonly completed: boolean;
}

export interface TodoState {
  readonly todos: readonly Todo[];
}

export type Page = "todos" | "stats";

export interface UiState {
  readonly page: Page;
}

export interface Snapshot {
  readonly version: number;
  readonly state: TodoState;
}

export interface Routes {
  readonly createTodo: string;
  readonly home: string;
  readonly runtime: string;
  readonly stats: string;
  readonly toggleTodo: (id: string) => string;
  readonly deleteTodo: (id: string) => string;
}

export interface TodoContext {
  readonly id: () => string;
  readonly [key: string]: unknown;
}

export interface CreateTodoPayload {
  readonly id: string;
  readonly title: string;
}

export type TodoStore = Store<TodoState>;

export type UiStore = Store<UiState>;

export type TodoRuntimeOperation = "create" | "toggle" | "delete";
