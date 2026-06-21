import { fail } from "./errors.js";
import type {
  Action,
  EventObject,
  Machine,
  MachineConfig,
  MachineSnapshot,
  StateValue,
  TransitionConfig,
  TransitionResult,
} from "./types.js";

export function createMachine<Context, Event extends EventObject, State extends StateValue = StateValue>(
  config: MachineConfig<Context, Event, State>,
): Machine<Context, Event, State> {
  validateConfig(config);

  const initialState = createSnapshot(config.initial, config.context, "active");

  return {
    config,
    id: config.id,
    initialState,
    transition(snapshot, event) {
      validateSnapshot(snapshot);
      const normalizedEvent = normalizeEvent<Event>(event);
      const state = config.states[snapshot.value];

      if (state === undefined) {
        fail(`Unknown state: ${snapshot.value}`);
      }

      const candidates = state.on?.[normalizedEvent.type];

      if (candidates === undefined) {
        return {
          snapshot,
          event: normalizedEvent,
          changed: false,
        };
      }

      const transitions = normalizeTransitions<Context, Event, State>(candidates);

      for (const transition of transitions) {
        const target = transition.target ?? snapshot.value;

        if (config.states[target] === undefined) {
          fail(`Unknown transition target: ${target}`);
        }

        const guard = transition.guard ?? transition.cond;

        if (guard !== undefined && !guard(snapshot.context, normalizedEvent, snapshot)) {
          continue;
        }

        const changedState = target !== snapshot.value;
        const nextContext = applyActions(snapshot, normalizedEvent, target, transition);
        const changedContext = !Object.is(nextContext, snapshot.context);
        const nextSnapshot = changedState || changedContext
          ? createSnapshot(target, nextContext, snapshot.status)
          : snapshot;

        return {
          snapshot: nextSnapshot,
          event: normalizedEvent,
          changed: changedState || changedContext,
        };
      }

      return {
        snapshot,
        event: normalizedEvent,
        changed: false,
      };
    },
  };
}

function applyActions<Context, Event extends EventObject, State extends StateValue>(
  snapshot: MachineSnapshot<Context, State>,
  event: Event,
  target: State,
  transition: TransitionConfig<Context, Event, State>,
): Context {
  let context = snapshot.context;
  const actions = collectActions(transition);

  for (const action of actions) {
    const nextContext = action(context, event, {
      event,
      source: snapshot.value,
      target,
      changed: target !== snapshot.value,
      snapshot,
    });

    if (nextContext !== undefined) {
      context = nextContext;
    }
  }

  return context;
}

function collectActions<Context, Event extends EventObject, State extends StateValue>(
  transition: TransitionConfig<Context, Event, State>,
): readonly Action<Context, Event, State>[] {
  if (transition.action !== undefined && transition.actions !== undefined) {
    fail("Use action or actions, not both");
  }

  if (transition.guard !== undefined && transition.cond !== undefined) {
    fail("Use guard or cond, not both");
  }

  if (transition.action !== undefined) {
    return [transition.action];
  }

  return transition.actions ?? [];
}

function createSnapshot<Context, State extends StateValue>(
  value: State,
  context: Context,
  status: "active" | "stopped",
): MachineSnapshot<Context, State> {
  return Object.freeze({
    value,
    context,
    status,
  });
}

function normalizeEvent<Event extends EventObject>(event: Event | string): Event {
  if (typeof event === "string") {
    if (event.length === 0) {
      fail("Event type must be a non-empty string");
    }

    return { type: event } as Event;
  }

  if (event === null || typeof event !== "object" || typeof event.type !== "string" || event.type.length === 0) {
    fail("Expected event with a non-empty type");
  }

  return event;
}

function normalizeTransitions<Context, Event extends EventObject, State extends StateValue>(
  transition: State | TransitionConfig<Context, Event, State> | readonly TransitionConfig<Context, Event, State>[],
): readonly TransitionConfig<Context, Event, State>[] {
  if (typeof transition === "string") {
    return [{ target: transition as State }];
  }

  if (Array.isArray(transition)) {
    if (transition.length === 0) {
      fail("Transition arrays must not be empty");
    }

    return transition as readonly TransitionConfig<Context, Event, State>[];
  }

  if (transition === null || typeof transition !== "object") {
    fail("Expected transition config");
  }

  return [transition as TransitionConfig<Context, Event, State>];
}

function validateConfig<Context, Event extends EventObject, State extends StateValue>(
  config: MachineConfig<Context, Event, State>,
): void {
  if (config === null || typeof config !== "object") {
    fail("Expected machine config");
  }

  if (typeof config.initial !== "string" || config.initial.length === 0) {
    fail("Expected initial state to be a non-empty string");
  }

  if (config.states === null || typeof config.states !== "object") {
    fail("Expected states object");
  }

  if (config.states[config.initial] === undefined) {
    fail(`Unknown initial state: ${config.initial}`);
  }

  for (const [stateName, state] of Object.entries(config.states) as Array<[string, StateNodeLike]>) {
    if (stateName.length === 0) {
      fail("State names must be non-empty strings");
    }

    if (state === null || typeof state !== "object") {
      fail(`Expected state config object: ${stateName}`);
    }

    if (state.on !== undefined && (state.on === null || typeof state.on !== "object")) {
      fail(`Expected transition map object: ${stateName}`);
    }
  }
}

interface StateNodeLike {
  readonly on?: unknown;
}

function validateSnapshot(snapshot: MachineSnapshot<unknown>): void {
  if (snapshot === null || typeof snapshot !== "object") {
    fail("Expected machine snapshot");
  }

  if (typeof snapshot.value !== "string" || snapshot.value.length === 0) {
    fail("Expected snapshot value to be a non-empty string");
  }

  if (snapshot.status !== "active" && snapshot.status !== "stopped") {
    fail("Expected snapshot status to be active or stopped");
  }
}
