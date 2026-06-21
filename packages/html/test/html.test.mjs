import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { createStore } from "@ts-zero/store/create";
import { HtmlError, action, formAction, fragment, h, list, mount, select, text } from "../dist/index.js";

installFakeDom();

describe("@ts-zero/html", () => {
  it("creates real HTML nodes with safe props, text children, and events", () => {
    let clicks = 0;
    const button = h(
      "button",
      {
        class: "primary",
        type: "button",
        disabled: true,
        dataset: { id: "save" },
        style: { backgroundColor: "red" },
        onClick: () => {
          clicks += 1;
        },
      },
      "Save ",
      1,
    );

    button.dispatchEvent({ type: "click" });

    assert.equal(button.tagName, "BUTTON");
    assert.equal(button.className, "primary");
    assert.equal(button.attributes.type, "button");
    assert.equal(button.attributes.disabled, "");
    assert.equal(button.dataset.id, "save");
    assert.equal(button.style.values["background-color"], "red");
    assert.equal(button.textContent, "Save 1");
    assert.equal(clicks, 1);
  });

  it("rejects unsafe HTML construction inputs", () => {
    assert.throws(() => h("<script>"), HtmlError);
    assert.throws(() => h("div", { innerHTML: "<img>" }), HtmlError);
    assert.throws(() => h("div", { on: { "bad event": () => undefined } }), HtmlError);
    assert.throws(() => h("div", { dataset: { "bad-name": "x" } }), HtmlError);
  });

  it("mounts and clears target content", () => {
    const target = document.createElement("main");
    target.appendChild(h("p", null, "old"));

    const handle = mount(target, h("section", null, h("h1", null, "New")));

    assert.equal(target.childNodes.length, 1);
    assert.equal(target.textContent, "New");
    assert.equal(handle.target, target);

    handle.unmount();

    assert.equal(target.childNodes.length, 0);
  });

  it("supports fragments and explicit text nodes", () => {
    const node = fragment(h("span", null, "A"), text("B"), [h("span", null, "C")]);
    const target = document.createElement("div");

    target.appendChild(node);

    assert.equal(target.textContent, "ABC");
  });

  it("select updates a bounded HTML region from store subscriptions", () => {
    const store = createCounterStore();
    const target = document.createElement("div");

    target.appendChild(select(store, (state) => state.count, (count) => h("strong", null, count)));

    assert.equal(target.textContent, "0");

    store.dispatch("inc");

    assert.equal(target.textContent, "1");
    assert.equal(target.childNodes.length, 3);
    assert.equal(target.childNodes[0].nodeType, 8);
    assert.equal(target.childNodes[2].nodeType, 8);
  });

  it("list renders arrays and rejects duplicate keys", () => {
    const store = createStore({
      state: { items: [{ id: "a", label: "A" }] },
      transitions: {
        add: (state) => ({ items: state.items.concat({ id: "b", label: "B" }) }),
        duplicate: () => ({ items: [{ id: "x", label: "X" }, { id: "x", label: "X again" }] }),
      },
    });
    const target = document.createElement("ul");

    target.appendChild(list(store, (state) => state.items, (item) => item.id, (item) => h("li", null, item.label)));

    assert.equal(target.textContent, "A");

    store.dispatch("add");

    assert.equal(target.textContent, "AB");
    assert.throws(() => store.dispatch("duplicate"), HtmlError);
  });

  it("action dispatches DOM events to a compatible store", () => {
    const store = createCounterStore();
    const button = h("button", { onClick: action(store, "add", () => 3) }, "+");

    button.dispatchEvent({ type: "click" });

    assert.equal(store.getState().count, 3);
  });

  it("formAction prevents default and dispatches FormData-derived payloads", () => {
    const store = createStore({
      state: { titles: [] },
      transitions: {
        add: (state, payload) => ({ titles: state.titles.concat(payload.title) }),
      },
    });
    const form = h("form", {
      onSubmit: formAction(store, "add", (_form, data) => ({ title: data.get("title") })),
    });
    form.appendChild(h("input", { name: "title", value: "Hello" }));
    const event = {
      type: "submit",
      currentTarget: form,
      defaultPrevented: false,
      preventDefault() {
        this.defaultPrevented = true;
      },
    };

    form.dispatchEvent(event);

    assert.equal(event.defaultPrevented, true);
    assert.deepEqual(store.getState().titles, ["Hello"]);
  });

  it("exposes focused subpaths for tree-shaking", async () => {
    const elementsModule = await import("../dist/elements.js");
    const actionsModule = await import("../dist/actions.js");
    const elementsSource = readFileSync(new URL("../dist/elements.js", import.meta.url), "utf8");
    const actionsSource = readFileSync(new URL("../dist/actions.js", import.meta.url), "utf8");

    assert.equal(typeof elementsModule.h, "function");
    assert.equal(typeof actionsModule.action, "function");
    assert.equal("action" in elementsModule, false);
    assert.equal("h" in actionsModule, false);
    assert.equal(elementsSource.includes("function action"), false);
    assert.equal(actionsSource.includes("function h"), false);
  });

  it("resolves public package subpaths", async () => {
    const root = await import("@ts-zero/html");
    const actions = await import("@ts-zero/html/actions");
    const bindings = await import("@ts-zero/html/bindings");
    const elements = await import("@ts-zero/html/elements");
    const mountModule = await import("@ts-zero/html/mount");
    const errors = await import("@ts-zero/html/errors");
    const types = await import("@ts-zero/html/types");

    assert.equal(typeof root.h, "function");
    assert.equal(typeof actions.formAction, "function");
    assert.equal(typeof bindings.select, "function");
    assert.equal(typeof elements.fragment, "function");
    assert.equal(typeof mountModule.mount, "function");
    assert.equal(typeof errors.HtmlError, "function");
    assert.deepEqual(Object.keys(types), []);
  });

  it("public barrel remains a re-export-only module for tree-checking", () => {
    const source = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");

    assert.match(source, /^export /m);
    assert.doesNotMatch(source, /function\s+/);
    assert.doesNotMatch(source, /const\s+/);
    assert.doesNotMatch(source, /let\s+/);
    assert.doesNotMatch(source, /class\s+/);
  });
});

function createCounterStore() {
  return createStore({
    state: { count: 0 },
    transitions: {
      inc: (state) => ({ count: state.count + 1 }),
      add: (state, value) => ({ count: state.count + value }),
    },
  });
}

function installFakeDom() {
  class FakeNode {
    constructor(nodeType, ownerDocument) {
      this.nodeType = nodeType;
      this.ownerDocument = ownerDocument;
      this.parentNode = null;
      this.childNodes = [];
    }

    get firstChild() {
      return this.childNodes[0] ?? null;
    }

    get nextSibling() {
      if (this.parentNode === null) {
        return null;
      }

      const index = this.parentNode.childNodes.indexOf(this);
      return this.parentNode.childNodes[index + 1] ?? null;
    }

    get textContent() {
      return this.childNodes.map((child) => child.textContent).join("");
    }

    set textContent(value) {
      this.childNodes = [this.ownerDocument.createTextNode(String(value))];
      this.childNodes[0].parentNode = this;
    }

    appendChild(child) {
      return this.insertBefore(child, null);
    }

    insertBefore(child, before) {
      if (child.nodeType === 11) {
        const moving = child.childNodes.slice();

        for (const item of moving) {
          this.insertBefore(item, before);
        }

        return child;
      }

      if (child.parentNode !== null) {
        child.parentNode.removeChild(child);
      }

      child.parentNode = this;

      if (before === null) {
        this.childNodes.push(child);
      } else {
        const index = this.childNodes.indexOf(before);

        if (index === -1) {
          throw new Error("Missing reference node");
        }

        this.childNodes.splice(index, 0, child);
      }

      return child;
    }

    removeChild(child) {
      const index = this.childNodes.indexOf(child);

      if (index === -1) {
        throw new Error("Missing child node");
      }

      this.childNodes.splice(index, 1);
      child.parentNode = null;
      return child;
    }
  }

  class FakeText extends FakeNode {
    constructor(value, ownerDocument) {
      super(3, ownerDocument);
      this.data = value;
    }

    get textContent() {
      return this.data;
    }

    set textContent(value) {
      this.data = String(value);
    }
  }

  class FakeComment extends FakeText {
    constructor(value, ownerDocument) {
      super(value, ownerDocument);
      this.nodeType = 8;
    }

    get textContent() {
      return "";
    }
  }

  class FakeStyle {
    constructor() {
      this.values = {};
    }

    setProperty(name, value) {
      this.values[name] = value;
    }
  }

  class FakeElement extends FakeNode {
    constructor(tagName, ownerDocument) {
      super(1, ownerDocument);
      this.tagName = tagName.toUpperCase();
      this.attributes = {};
      this.className = "";
      this.dataset = {};
      this.style = new FakeStyle();
      this.listeners = {};
    }

    setAttribute(name, value) {
      this.attributes[name] = String(value);

      if (name === "value") {
        this.value = String(value);
      }

      if (name === "name") {
        this.name = String(value);
      }
    }

    addEventListener(name, handler) {
      this.listeners[name] ??= [];
      this.listeners[name].push(handler);
    }

    dispatchEvent(event) {
      event.currentTarget ??= this;
      event.target ??= this;

      for (const handler of this.listeners[event.type] ?? []) {
        handler(event);
      }

      return true;
    }
  }

  class FakeDocument {
    createElement(tagName) {
      return new FakeElement(tagName, this);
    }

    createTextNode(value) {
      return new FakeText(value, this);
    }

    createComment(value) {
      return new FakeComment(value, this);
    }

    createDocumentFragment() {
      return new FakeNode(11, this);
    }
  }

  class FakeFormData {
    constructor(form) {
      this.values = new Map();
      collectInputs(form, this.values);
    }

    get(name) {
      return this.values.get(name) ?? null;
    }
  }

  globalThis.document = new FakeDocument();
  globalThis.HTMLFormElement = FakeElement;
  globalThis.FormData = FakeFormData;
}

function collectInputs(node, values) {
  if (node.name !== undefined) {
    values.set(node.name, node.value ?? "");
  }

  for (const child of node.childNodes) {
    collectInputs(child, values);
  }
}
