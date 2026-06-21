export type HtmlPrimitive = string | number | boolean;

export type HtmlChild = Node | HtmlPrimitive | null | undefined | readonly HtmlChild[];

export type HtmlChildren = readonly HtmlChild[];

export type HtmlEventHandler<EventType extends Event = Event> = (event: EventType) => void;

export type HtmlEventMap = Readonly<Record<string, HtmlEventHandler>>;

export type HtmlStyleMap = Readonly<Record<string, string | number | null | undefined>>;

export type HtmlDataset = Readonly<Record<string, string | number | boolean | null | undefined>>;

export type HtmlPropValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | HtmlEventHandler
  | HtmlEventMap
  | HtmlStyleMap
  | HtmlDataset;

export interface HtmlProps {
  readonly class?: string;
  readonly className?: string;
  readonly dataset?: HtmlDataset;
  readonly style?: string | HtmlStyleMap;
  readonly on?: HtmlEventMap;
  readonly [name: string]: HtmlPropValue;
}

export interface MountHandle {
  readonly target: Element | DocumentFragment;
  readonly node: Node;
  readonly unmount: () => void;
}

export type Equality<Selected> = (left: Selected, right: Selected) => boolean;

export type Selector<State, Selected> = (state: State) => Selected;

export type Unsubscribe = () => void;

export type TransitionName = string;

export interface StoreLike<State> {
  readonly getState: () => State;
  readonly dispatch: <Payload = unknown>(type: TransitionName, payload?: Payload) => unknown;
  readonly subscribe: <Selected>(
    selector: Selector<State, Selected>,
    listener: (next: Selected, previous: Selected, meta: unknown) => void,
    options?: BindingOptions<Selected>,
  ) => Unsubscribe;
}

export interface BindingOptions<Selected> {
  readonly equals?: Equality<Selected>;
}

export interface BoundFragment extends DocumentFragment {
  readonly unsubscribe: Unsubscribe;
}

export type HtmlRenderer<Value> = (value: Value) => HtmlChild;

export type ListKey<Value> = (value: Value, index: number) => string | number;

export type ActionPayload<EventType extends Event, Payload> = Payload | ((event: EventType) => Payload);

export type FormPayload<Payload> = Payload | ((form: HTMLFormElement, data: FormData, event: SubmitEvent) => Payload);

export type {
  StoreLike as Store,
};
