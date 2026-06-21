# @ts-zero/html

Zero-dependency HTML UI runtime for store-driven browser interfaces.

This package targets browser HTML. It is not a cross-platform UI abstraction, not a mobile UI layer, and not the portable core. The portable core remains state, actions, snapshots, patches, routing, and future protocol packages.

## Install

```sh
npm install @ts-zero/html
```

## v0 Scope

- create real HTML nodes with `h`
- create safe text nodes with `text`
- group children with `fragment`
- mount and clear HTML targets
- bind store selectors to bounded HTML regions with `select`
- render store-backed arrays with `list`
- dispatch DOM events to compatible stores with `action`
- dispatch submit events with `formAction`
- optional JSX automatic runtime through `@ts-zero/html/jsx-runtime`

No compiler owned by this package, no JSX requirement, no virtual DOM, no templates, no scheduler, no router, no network transport.

## Usage

```ts
import { action, formAction } from "@ts-zero/html/actions";
import { list, select } from "@ts-zero/html/bindings";
import { h } from "@ts-zero/html/elements";
import { mount } from "@ts-zero/html/mount";

mount(
  document.body,
  h("main", null,
    h("h1", null, "Todos"),
    h("form", { onSubmit: formAction(store, "todos.create", (_form, data) => ({
      title: data.get("title"),
    })) },
      h("input", { name: "title", required: true, autocomplete: "off" }),
      h("button", { type: "submit" }, "Add"),
    ),
    select(store, (state) => state.todos.length, (count) =>
      h("p", null, `${count} todos`),
    ),
    h("ul", null,
      list(
        store,
        (state) => state.todos,
        (todo) => todo.id,
        (todo) => h("li", null,
          h("span", null, todo.title),
          h("button", { onClick: action(store, "todos.toggle", todo.id) }, "Done"),
        ),
      ),
    ),
  ),
);
```

## Optional JSX

`@ts-zero/html` also exposes a zero-dependency JSX runtime. It is optional: applications can compile TSX with TypeScript, Bun, or their own tooling.

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@ts-zero/html"
  }
}
```

```tsx
/** @jsxImportSource @ts-zero/html */
import { mount } from "@ts-zero/html/mount";

function TodoItem({ todo }) {
  return (
    <li class={todo.completed ? "done" : ""}>
      <span class="title">{todo.title}</span>
    </li>
  );
}

mount(document.body, <TodoItem todo={todo} />);
```

The JSX runtime produces the same real HTML nodes as `h`; it does not introduce React compatibility, a virtual DOM, or a scheduler.

## Store Compatibility

`@ts-zero/html` does not import `@ts-zero/store` at runtime and does not require it as a package dependency. It accepts any store-shaped object with:

```ts
{
  getState(): State;
  dispatch(type, payload?): unknown;
  subscribe(selector, listener, options?): () => void;
}
```

This keeps the package zero-dependency and lets other runtimes implement the same shape.

## Security

- No `innerHTML`, `outerHTML`, or `insertAdjacentHTML`.
- String and number children become text nodes.
- Tag names, event names, dataset names, and style names are validated.
- Event handlers must be explicit functions.
- `formAction` prevents default submit behavior and dispatches through the store.
- No eval, parser, template compiler, global registry, network access, or filesystem access.

## Tree-Shaking

This package is optimized for top-tier tree-shaking:

- ESM only.
- `sideEffects: false`.
- `index.ts` is only a re-export file.
- focused subpaths: `@ts-zero/html/elements`, `/mount`, `/bindings`, `/actions`, `/jsx-runtime`, `/jsx-dev-runtime`, `/errors`, `/types`.
- no top-level DOM reads.
- no global auto-mounting or runtime patching.

Prefer focused imports in bundle-sensitive code:

```ts
import { h } from "@ts-zero/html/elements";
import { select } from "@ts-zero/html/bindings";
```

## Non-Goals

- No React compatibility layer.
- No mobile UI abstraction.
- No server rendering in v0.
- No hydration protocol in v0.
- No generalized virtual DOM.
- No JSX requirement.
- No CSS system.
- No animation system.
