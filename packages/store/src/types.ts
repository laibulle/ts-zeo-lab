export type TransitionName = string;

export type StoreVersion = number;

export type JsonLike =
  | null
  | boolean
  | number
  | string
  | readonly JsonLike[]
  | {
      readonly [key: string]: JsonLike;
    };

export interface StoreAction<Payload = unknown> {
  readonly type: TransitionName;
  readonly payload?: Payload;
  readonly baseVersion?: StoreVersion;
}

export interface StoreContext {
  readonly now?: () => number;
  readonly id?: () => string;
  readonly [key: string]: unknown;
}

export type Transition<State, Payload = unknown, Context extends StoreContext = StoreContext> = (
  state: State,
  payload: Payload,
  context: Context,
) => State;

export type Transitions<State, Context extends StoreContext = StoreContext> = Record<
  string,
  Transition<State, any, Context>
>;

export interface StoreSnapshot<State> {
  readonly version: StoreVersion;
  readonly state: State;
}

export interface ReplaceStatePatch<State> {
  readonly kind: "replace";
  readonly from: StoreVersion;
  readonly to: StoreVersion;
  readonly state: State;
}

export type StorePatch<State> = ReplaceStatePatch<State>;

export interface StoreMeta<Payload = unknown> {
  readonly version: StoreVersion;
  readonly previousVersion: StoreVersion;
  readonly source: "dispatch" | "hydrate" | "patch";
  readonly action?: StoreAction<Payload>;
}

export type Selector<State, Selected> = (state: State) => Selected;

export type Equality<Selected> = (left: Selected, right: Selected) => boolean;

export type StoreListener<Selected, Payload = unknown> = (
  next: Selected,
  previous: Selected,
  meta: StoreMeta<Payload>,
) => void;

export interface SubscribeOptions<Selected> {
  readonly equals?: Equality<Selected>;
  readonly fireImmediately?: boolean;
}

export type Unsubscribe = () => void;

export interface DispatchOk<State, Payload = unknown> {
  readonly ok: true;
  readonly version: StoreVersion;
  readonly previousVersion: StoreVersion;
  readonly action: StoreAction<Payload>;
  readonly patch: StorePatch<State>;
  readonly state: State;
}

export interface DispatchNoop<State, Payload = unknown> {
  readonly ok: true;
  readonly noop: true;
  readonly version: StoreVersion;
  readonly previousVersion: StoreVersion;
  readonly action: StoreAction<Payload>;
  readonly state: State;
}

export interface DispatchConflict {
  readonly ok: false;
  readonly reason: "version_conflict";
  readonly version: StoreVersion;
  readonly expectedVersion: StoreVersion;
}

export type DispatchResult<State, Payload = unknown> =
  | DispatchOk<State, Payload>
  | DispatchNoop<State, Payload>
  | DispatchConflict;

export interface CreateStoreOptions<State, Context extends StoreContext = StoreContext> {
  readonly state: State;
  readonly transitions: Transitions<State, Context>;
  readonly context?: Context;
  readonly version?: StoreVersion;
  readonly freeze?: boolean;
}

export interface Store<State> {
  readonly getState: () => State;
  readonly version: () => StoreVersion;
  readonly snapshot: () => StoreSnapshot<State>;
  readonly dispatch: {
    <Payload = unknown>(type: TransitionName, payload?: Payload): DispatchResult<State, Payload>;
    <Payload = unknown>(action: StoreAction<Payload>): DispatchResult<State, Payload>;
  };
  readonly hydrate: (snapshot: StoreSnapshot<State>) => StoreSnapshot<State>;
  readonly applyPatch: (patch: StorePatch<State>) => StoreSnapshot<State>;
  readonly subscribe: <Selected>(
    selector: Selector<State, Selected>,
    listener: StoreListener<Selected>,
    options?: SubscribeOptions<Selected>,
  ) => Unsubscribe;
}
