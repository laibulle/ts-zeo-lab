import type { TodoMutationClient } from "../mutations.js";
import { createTodoPayload } from "../todo-store.js";

export function TodoComposer({
  mutations,
  action,
}: {
  readonly mutations: TodoMutationClient;
  readonly action: string;
}) {
  return (
    <form
      class="composer"
      method="post"
      action={action}
      onSubmit={(event: SubmitEvent) => {
        event.preventDefault();

        const form = event.currentTarget;

        if (!(form instanceof HTMLFormElement)) {
          throw new Error("Expected submit event target to be a form");
        }

        const title = String(new FormData(form).get("title") ?? "");
        const payload = createTodoPayload(title);

        if (payload === null) {
          return;
        }

        void mutations.dispatch("create", {
          id: payload.id,
          title: payload.title,
        }).then(() => {
          form.reset();
        });
      }}
    >
      <input name="id" type="hidden" />
      <input name="title" autocomplete="off" maxlength={120} placeholder="Add a task" required />
      <button type="submit">Add</button>
    </form>
  );
}
