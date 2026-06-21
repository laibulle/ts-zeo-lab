import { createTodoEntity } from "../domain/todo.mjs";

export function createTodoUseCases({ repository, createId, isTodoId }) {
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
