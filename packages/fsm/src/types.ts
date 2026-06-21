export type StateValue = string;

export interface EventObject {
  readonly type: string;
  readonly [key: string]: unknown;
}

export interface MachineSnapshot<Context, State extends StateValue = StateValue> {
  readonly value: State;
  readonly context: Context;
  readonly status: ActorStatus;
}

export type ActorStatus = "active" | "stopped";

export interface Meta<Context, Event extends EventObject, State extends StateValue> {
  readonly event: Event;
  readonly source: State;
  readonly target: State;
  readonly changed: boolean;
  readonly snapshot: MachineSnapshot<Context, State>;
}

export type Guard<Context, Event extends EventObject, State extends StateValue = StateValue> = (
  context: Context,
  event: Event,
  snapshot: MachineSnapshot<Context, State>,
) => boolean;

export type Action<Context, Event extends EventObject, State extends StateValue = StateValue> = (
  context: Context,
  event: Event,
  meta: Meta<Context, Event, State>,
) => Context | void;

export type AssignInput<Context, Event extends EventObject> =
  | Partial<Context>
  | ((context: Context, event: Event) => Partial<Context>);

export interface TransitionConfig<Context, Event extends EventObject, State extends StateValue = StateValue> {
  readonly target?: State;
  readonly cond?: Guard<Context, Event, State>;
  readonly guard?: Guard<Context, Event, State>;
  readonly action?: Action<Context, Event, State>;
  readonly actions?: readonly Action<Context, Event, State>[];
}

export interface StateNodeConfig<Context, Event extends EventObject, State extends StateValue = StateValue> {
  readonly description?: string;
  readonly meta?: unknown;
  readonly on?: Readonly<Record<string, State | TransitionConfig<Context, Event, State> | readonly TransitionConfig<Context, Event, State>[]>>;
  readonly tags?: readonly string[];
  readonly type?: "atomic" | "final";
}

export interface MachineConfig<Context, Event extends EventObject, State extends StateValue = StateValue> {
  readonly description?: string;
  readonly id?: string;
  readonly initial: State;
  readonly context: Context;
  readonly meta?: unknown;
  readonly states: Readonly<Record<State, StateNodeConfig<Context, Event, State>>>;
}

export interface TransitionResult<Context, Event extends EventObject, State extends StateValue = StateValue> {
  readonly snapshot: MachineSnapshot<Context, State>;
  readonly event: Event;
  readonly changed: boolean;
}

export interface Machine<Context, Event extends EventObject, State extends StateValue = StateValue> {
  readonly config: MachineConfig<Context, Event, State>;
  readonly id?: string;
  readonly initialState: MachineSnapshot<Context, State>;
  transition(snapshot: MachineSnapshot<Context, State>, event: Event | string): TransitionResult<Context, Event, State>;
}

export type ServiceListener<Context, Event extends EventObject, State extends StateValue = StateValue> = (
  snapshot: MachineSnapshot<Context, State>,
  previousSnapshot: MachineSnapshot<Context, State>,
  event: Event,
) => void;

export type Unsubscribe = () => void;

export interface Service<Context, Event extends EventObject, State extends StateValue = StateValue> {
  getSnapshot(): MachineSnapshot<Context, State>;
  send(event: Event | string): TransitionResult<Context, Event, State>;
  start(snapshot?: MachineSnapshot<Context, State>): MachineSnapshot<Context, State>;
  stop(): MachineSnapshot<Context, State>;
  subscribe(listener: ServiceListener<Context, Event, State>): Unsubscribe;
}
