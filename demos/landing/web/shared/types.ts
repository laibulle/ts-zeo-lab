import type { Store } from "@ts-zero/store";
import type { MutationActionResult, MutationResult, MutationSnapshotResult } from "@ts-zero/mutation/types";

export interface Todo {
  readonly id: string;
  readonly title: string;
  readonly completed: boolean;
}

export interface TodoState {
  readonly todos: readonly Todo[];
}

export interface CounterState {
  readonly value: number;
}

export type Page = "landing" | "counter" | "todos" | "stats";

export interface UiState {
  readonly page: Page;
}

export interface Snapshot {
  readonly version: number;
  readonly state: TodoState;
}

export interface CounterSnapshot {
  readonly version: number;
  readonly state: CounterState;
}

export interface CounterBootstrap {
  readonly snapshot: CounterSnapshot;
  readonly streams: boolean;
}

export type TodoMutationActionType = "createTodo" | "toggleTodo" | "deleteTodo";

export type TodoMutationPayload = Todo | string;

export type TodoMutationActionResult = MutationActionResult<TodoMutationPayload> & {
  readonly action: {
    readonly type: TodoMutationActionType;
    readonly payload?: TodoMutationPayload;
  };
};

export type TodoMutationSnapshotResult = MutationSnapshotResult<Snapshot>;

export type TodoRuntimeResult = MutationResult<Snapshot, TodoMutationPayload>;

export type CounterMutationActionType = "incrementCounter" | "resetCounter";

export type CounterMutationPayload = number;

export type CounterMutationActionResult = MutationActionResult<CounterMutationPayload> & {
  readonly action: {
    readonly type: CounterMutationActionType;
    readonly payload?: CounterMutationPayload;
  };
};

export type CounterRuntimeResult = MutationResult<CounterSnapshot, CounterMutationPayload>;

export interface Routes {
  readonly counter: string;
  readonly counterEvents: string;
  readonly counterMutations: string;
  readonly counterReconcile: string;
  readonly createTodo: string;
  readonly home: string;
  readonly mutations: string;
  readonly stats: string;
  readonly todos: string;
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

export type CounterStore = Store<CounterState>;

export type UiStore = Store<UiState>;

export type TodoRuntimeOperation = "create" | "toggle" | "delete";

export type CounterRuntimeOperation = "increment" | "reset";
