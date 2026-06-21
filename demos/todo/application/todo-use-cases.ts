import { createTodoEntity, type Todo } from "../domain/todo.js";

export interface TodoRepository {
  readonly listTodos: () => readonly Todo[];
  readonly countTodos: () => number;
  readonly createTodo: (todo: Todo) => void;
  readonly toggleTodo: (id: string) => void;
  readonly deleteTodo: (id: string) => void;
  readonly close: () => void;
}

export interface CreateTodoCommand {
  readonly id?: unknown;
  readonly title?: unknown;
}

export interface TodoIdCommand {
  readonly id?: unknown;
}

export interface TodoUseCases {
  readonly listTodos: () => readonly Todo[];
  readonly createTodo: (command: CreateTodoCommand) => Todo | null;
  readonly toggleTodo: (command: TodoIdCommand) => boolean;
  readonly deleteTodo: (command: TodoIdCommand) => boolean;
  readonly seed: () => void;
}

export function createTodoUseCases({
  repository,
  createId,
  isTodoId,
}: {
  readonly repository: TodoRepository;
  readonly createId: () => string;
  readonly isTodoId: (id: unknown) => id is string;
}): TodoUseCases {
  return {
    listTodos() {
      return repository.listTodos();
    },
    createTodo(command) {
      const candidateId = typeof command?.id === "string" && isTodoId(command.id) ? command.id : createId();
      const todo = createTodoEntity({
        id: candidateId,
        title: command?.title,
      });

      if (todo === null) {
        return null;
      }

      repository.createTodo(todo);
      return todo;
    },
    toggleTodo(command) {
      if (typeof command?.id !== "string" || !isTodoId(command.id)) {
        return false;
      }

      repository.toggleTodo(command.id);
      return true;
    },
    deleteTodo(command) {
      if (typeof command?.id !== "string" || !isTodoId(command.id)) {
        return false;
      }

      repository.deleteTodo(command.id);
      return true;
    },
    seed() {
      if (repository.countTodos() !== 0) {
        return;
      }

      const done = createTodoEntity({
        id: createId(),
        title: "Faire tourner @ts-zero/http",
      });
      const open = createTodoEntity({
        id: createId(),
        title: "Imaginer le protocole live",
      });

      if (done !== null) {
        repository.createTodo(done);
        repository.toggleTodo(done.id);
      }

      if (open !== null) {
        repository.createTodo(open);
      }
    },
  };
}
