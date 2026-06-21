import { fragment, h } from "./elements.js";
import type { HtmlChild, HtmlChildren, HtmlProps } from "./types.js";

declare global {
  namespace JSX {
    type Element = HtmlChild;
    interface ElementChildrenAttribute {
      children: {};
    }
    interface IntrinsicElements {
      [name: string]: JsxIntrinsicProps;
    }
  }
}

export const Fragment = Symbol.for("ts-zero.html.fragment");

export function jsx(type: string | typeof Fragment | Component, props: JsxProps | null): HtmlChild {
  return createJsxNode(type, props);
}

export function jsxs(type: string | typeof Fragment | Component, props: JsxProps | null): HtmlChild {
  return createJsxNode(type, props);
}

export function jsxDEV(type: string | typeof Fragment | Component, props: JsxProps | null): HtmlChild {
  return createJsxNode(type, props);
}

export type Component<Props extends object = Record<string, unknown>> = (props: Props) => HtmlChild;

export type JsxProps = Omit<HtmlProps, "children"> & {
  readonly children?: HtmlChild;
};

export interface JsxIntrinsicProps {
  readonly children?: HtmlChild;
  readonly [name: string]: unknown;
}

function createJsxNode(type: string | typeof Fragment | Component, props: JsxProps | null): HtmlChild {
  const normalizedProps = props ?? {};
  const children = normalizeChildren(normalizedProps.children);

  if (type === Fragment) {
    return fragment(...children);
  }

  if (typeof type === "function") {
    return type(normalizedProps);
  }

  const { children: _children, ...elementProps } = normalizedProps;
  return h(type, elementProps, ...children);
}

function normalizeChildren(children: HtmlChild | undefined): HtmlChildren {
  if (children === undefined) {
    return [];
  }

  return Array.isArray(children) ? children : [children];
}
