import { appendChildren } from "./elements.js";
import { fail } from "./errors.js";
import type { HtmlChild, MountHandle } from "./types.js";

export function mount(target: Element | DocumentFragment, child: HtmlChild): MountHandle {
  validateTarget(target);
  clear(target);

  const fragment = document.createDocumentFragment();
  appendChildren(fragment, [child]);
  const node = fragment.childNodes.length === 1 ? fragment.firstChild : fragment;

  if (node === null) {
    fail("Expected mount child to produce a node");
  }

  target.appendChild(node);

  return {
    target,
    node,
    unmount: () => {
      clear(target);
    },
  };
}

export function clear(target: Element | DocumentFragment): void {
  validateTarget(target);

  while (target.firstChild !== null) {
    target.removeChild(target.firstChild);
  }
}

function validateTarget(target: Element | DocumentFragment): void {
  if (target === null || typeof target !== "object" || typeof target.appendChild !== "function") {
    fail("Expected mount target to be an Element or DocumentFragment");
  }
}
