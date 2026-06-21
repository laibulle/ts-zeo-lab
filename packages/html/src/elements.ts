import { fail } from "./errors.js";
import type { HtmlChild, HtmlChildren, HtmlEventMap, HtmlProps, HtmlStyleMap } from "./types.js";

const TAG_NAME_PATTERN = /^[a-z][.0-9_a-z-]*$/i;
const UNSAFE_PROP_NAMES = new Set(["innerHTML", "outerHTML", "insertAdjacentHTML"]);

export function h<TagName extends keyof HTMLElementTagNameMap>(
  tagName: TagName,
  props?: HtmlProps | null,
  ...children: HtmlChildren
): HTMLElementTagNameMap[TagName];
export function h(tagName: string, props?: HtmlProps | null, ...children: HtmlChildren): HTMLElement;
export function h(tagName: string, props?: HtmlProps | null, ...children: HtmlChildren): HTMLElement {
  validateTagName(tagName);

  const element = document.createElement(tagName);

  if (props !== undefined && props !== null) {
    applyProps(element, props);
  }

  appendChildren(element, children);

  return element;
}

export function text(value: string | number | boolean): Text {
  return document.createTextNode(String(value));
}

export function fragment(...children: HtmlChildren): DocumentFragment {
  const node = document.createDocumentFragment();
  appendChildren(node, children);
  return node;
}

export function appendChildren(parent: Node, children: HtmlChildren): void {
  for (const child of children) {
    appendChild(parent, child);
  }
}

function appendChild(parent: Node, child: HtmlChild): void {
  if (child === null || child === undefined || child === false) {
    return;
  }

  if (isHtmlChildArray(child)) {
    appendChildren(parent, child);
    return;
  }

  if (isNode(child)) {
    parent.appendChild(child);
    return;
  }

  parent.appendChild(text(child));
}

function applyProps(element: HTMLElement, props: HtmlProps): void {
  for (const [name, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) {
      continue;
    }

    if (UNSAFE_PROP_NAMES.has(name)) {
      fail(`Unsafe HTML property is not supported: ${name}`);
    }

    if (name === "class" || name === "className") {
      element.className = String(value);
      continue;
    }

    if (name === "dataset") {
      applyDataset(element, value);
      continue;
    }

    if (name === "style") {
      applyStyle(element, value);
      continue;
    }

    if (name === "on") {
      applyEventMap(element, value);
      continue;
    }

    if (name.startsWith("on") && typeof value === "function") {
      const eventName = name.slice(2).toLowerCase();
      validateEventName(eventName);
      element.addEventListener(eventName, value as EventListener);
      continue;
    }

    if (typeof value === "function" || typeof value === "object") {
      fail(`Unsupported HTML property value: ${name}`);
    }

    setValue(element, name, value);
  }
}

function applyDataset(element: HTMLElement, value: unknown): void {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail("Expected dataset to be an object");
  }

  for (const [name, item] of Object.entries(value as Record<string, unknown>)) {
    validateDataName(name);

    if (item === undefined || item === null) {
      continue;
    }

    element.dataset[name] = String(item);
  }
}

function applyStyle(element: HTMLElement, value: unknown): void {
  if (typeof value === "string") {
    element.setAttribute("style", value);
    return;
  }

  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail("Expected style to be a string or object");
  }

  for (const [name, item] of Object.entries(value as HtmlStyleMap)) {
    validateStyleName(name);

    if (item === undefined || item === null) {
      continue;
    }

    element.style.setProperty(toKebabCase(name), String(item));
  }
}

function applyEventMap(element: HTMLElement, value: unknown): void {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail("Expected on to be an event handler object");
  }

  for (const [name, handler] of Object.entries(value as HtmlEventMap)) {
    validateEventName(name);

    if (typeof handler !== "function") {
      fail(`Expected event handler to be a function: ${name}`);
    }

    element.addEventListener(name, handler as EventListener);
  }
}

function setValue(element: HTMLElement, name: string, value: string | number | boolean): void {
  if (value === true) {
    element.setAttribute(name, "");
    return;
  }

  element.setAttribute(name, String(value));
}

function validateTagName(tagName: string): void {
  if (!TAG_NAME_PATTERN.test(tagName)) {
    fail("Expected a safe HTML tag name");
  }
}

function validateEventName(name: string): void {
  if (!/^[a-z][.0-9_a-z-]*$/i.test(name)) {
    fail("Expected a safe event name");
  }
}

function validateDataName(name: string): void {
  if (!/^[a-z][0-9A-Za-z_]*$/.test(name)) {
    fail("Expected a safe dataset name");
  }
}

function validateStyleName(name: string): void {
  if (!/^-?[A-Za-z][0-9A-Za-z-]*$/.test(name)) {
    fail("Expected a safe style name");
  }
}

function toKebabCase(name: string): string {
  return name.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}

function isNode(value: unknown): value is Node {
  return value !== null && typeof value === "object" && typeof (value as Node).nodeType === "number";
}

function isHtmlChildArray(value: unknown): value is readonly HtmlChild[] {
  return Array.isArray(value);
}
