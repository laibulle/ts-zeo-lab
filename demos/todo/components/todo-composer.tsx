import { formAction } from "@ts-zero/html/actions";
import type { HtmlChild } from "@ts-zero/html/types";
import { withServerPost } from "../pages/server-post.js";
import { createTodoPayload } from "../pages/todo-store.js";
import type { TodoStore } from "../pages/types.js";

export function TodoComposer({ store, action }: { readonly store: TodoStore; readonly action: string }): HtmlChild {
  return (
    <form
      class="composer"
      method="post"
      action={action}
      onSubmit={withServerPost(
        formAction(store, "createTodo", (form, data) => {
          const title = String(data.get("title") ?? "");
          const payload = createTodoPayload(title);

          if (payload === null) {
            return "";
          }

          const idField = form.elements.namedItem("id");

          if (idField instanceof HTMLInputElement) {
            idField.value = payload.id;
          }

          data.set("id", payload.id);
          data.set("title", payload.title);

          return payload;
        }),
        (form) => {
          form.reset();
        },
      )}
    >
      <input name="id" type="hidden" />
      <input name="title" autocomplete="off" maxlength={120} placeholder="Add a task" required />
      <button type="submit">Add</button>
    </form>
  );
}
