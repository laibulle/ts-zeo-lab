import { appendChildren } from "./elements.js";
import { fail } from "./errors.js";
import type { BindingOptions, BoundFragment, HtmlChild, HtmlRenderer, ListKey, StoreLike } from "./types.js";

export function select<State, Selected>(
  store: StoreLike<State>,
  selector: (state: State) => Selected,
  render: HtmlRenderer<Selected>,
  options: BindingOptions<Selected> = {},
): BoundFragment {
  validateStore(store);
  validateFunction(selector, "selector");
  validateFunction(render, "renderer");

  const boundary = createBoundary();
  const unsubscribe = store.subscribe(
    selector,
    (next) => {
      replaceBoundaryContent(boundary.start, boundary.end, render(next));
    },
    options,
  );

  replaceBoundaryContent(boundary.start, boundary.end, render(selector(store.getState())));

  return attachUnsubscribe(boundary.fragment, unsubscribe);
}

export function list<State, Item>(
  store: StoreLike<State>,
  selector: (state: State) => readonly Item[],
  key: ListKey<Item>,
  render: HtmlRenderer<Item>,
  options: BindingOptions<readonly Item[]> = {},
): BoundFragment {
  validateStore(store);
  validateFunction(selector, "selector");
  validateFunction(key, "key");
  validateFunction(render, "renderer");

  return select(
    store,
    selector,
    (items) => {
      assertUniqueKeys(items, key);
      return items.map((item) => render(item));
    },
    options,
  );
}

interface Boundary {
  readonly fragment: DocumentFragment;
  readonly start: Comment;
  readonly end: Comment;
}

function createBoundary(): Boundary {
  const fragment = document.createDocumentFragment();
  const start = document.createComment("ts-zero:start");
  const end = document.createComment("ts-zero:end");
  fragment.appendChild(start);
  fragment.appendChild(end);
  return { fragment, start, end };
}

function replaceBoundaryContent(start: Comment, end: Comment, child: HtmlChild): void {
  const parent = start.parentNode;

  if (parent === null) {
    return;
  }

  let current = start.nextSibling;

  while (current !== null && current !== end) {
    const next = current.nextSibling;
    parent.removeChild(current);
    current = next;
  }

  const fragment = document.createDocumentFragment();
  appendChildren(fragment, [child]);
  parent.insertBefore(fragment, end);
}

function attachUnsubscribe(fragment: DocumentFragment, unsubscribe: () => void): BoundFragment {
  Object.defineProperty(fragment, "unsubscribe", {
    value: unsubscribe,
    enumerable: false,
  });

  return fragment as BoundFragment;
}

function assertUniqueKeys<Item>(items: readonly Item[], key: ListKey<Item>): void {
  const keys = new Set<string | number>();

  for (let index = 0; index < items.length; index += 1) {
    const value = key(items[index] as Item, index);

    if (typeof value !== "string" && typeof value !== "number") {
      fail("Expected list key to be a string or number");
    }

    if (keys.has(value)) {
      fail(`Duplicate list key: ${String(value)}`);
    }

    keys.add(value);
  }
}

function validateStore<State>(store: StoreLike<State>): void {
  if (store === null || typeof store !== "object" || typeof store.subscribe !== "function" || typeof store.getState !== "function") {
    fail("Expected a @ts-zero/store instance");
  }
}

function validateFunction(value: unknown, label: string): void {
  if (typeof value !== "function") {
    fail(`Expected ${label} to be a function`);
  }
}
