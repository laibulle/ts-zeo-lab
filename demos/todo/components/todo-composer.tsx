import { formAction } from "@ts-zero/html/actions";
import type { HtmlChild } from "@ts-zero/html/types";
import { withServerPost } from "../pages/server-post.js";
import type { TodoStore } from "../pages/types.js";

export function TodoComposer({ store, action }: { readonly store: TodoStore; readonly action: string }): HtmlChild {
  return (
    <form
      class="composer"
      method="post"
      action={action}
      onSubmit={withServerPost(
        formAction(store, "createTodo", (_form, data) => String(data.get("title") ?? "").trim()),
        (form) => {
          form.reset();
        },
      )}
    >
      <input name="title" autocomplete="off" maxlength={120} placeholder="Add a task" required />
      <button type="submit">Add</button>
    </form>
  );
}
