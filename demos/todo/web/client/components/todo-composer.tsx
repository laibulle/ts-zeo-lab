import type { HtmlChild } from "@ts-zero/html/types";
import type { TodoWebRuntime } from "../runtime.js";
import { createTodoPayload } from "../todo-store.js";

export function TodoComposer({
  runtime,
  action,
}: {
  readonly runtime: TodoWebRuntime;
  readonly action: string;
}): HtmlChild {
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

        void runtime.dispatch("create", {
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
