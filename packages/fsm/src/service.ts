import { fail } from "./errors.js";
import type { EventObject, Machine, MachineSnapshot, Service, ServiceListener, StateValue, Unsubscribe } from "./types.js";

export function createService<Context, Event extends EventObject, State extends StateValue = StateValue>(
  machine: Machine<Context, Event, State>,
): Service<Context, Event, State> {
  if (machine === null || typeof machine !== "object" || typeof machine.transition !== "function") {
    fail("Expected machine");
  }

  const listeners: ServiceListener<Context, Event, State>[] = [];
  let snapshot = machine.initialState;

  return {
    getSnapshot: () => snapshot,
    send: (event) => {
      if (snapshot.status !== "active") {
        fail("Cannot send events to a stopped service");
      }

      const previousSnapshot = snapshot;
      const result = machine.transition(snapshot, event);
      snapshot = result.snapshot;

      if (result.changed) {
        notify(snapshot, previousSnapshot, result.event);
      }

      return result;
    },
    start: (nextSnapshot) => {
      snapshot = nextSnapshot === undefined ? machine.initialState : asActive(nextSnapshot);
      return snapshot;
    },
    stop: () => {
      snapshot = Object.freeze({
        ...snapshot,
        status: "stopped",
      });
      return snapshot;
    },
    subscribe: (listener) => {
      if (typeof listener !== "function") {
        fail("Expected listener to be a function");
      }

      listeners.push(listener);

      return () => {
        const index = listeners.indexOf(listener);

        if (index !== -1) {
          listeners.splice(index, 1);
        }
      };
    },
  };

  function notify(
    nextSnapshot: MachineSnapshot<Context, State>,
    previousSnapshot: MachineSnapshot<Context, State>,
    event: Event,
  ): void {
    for (const listener of listeners.slice()) {
      listener(nextSnapshot, previousSnapshot, event);
    }
  }
}

function asActive<Context, State extends StateValue>(snapshot: MachineSnapshot<Context, State>): MachineSnapshot<Context, State> {
  if (snapshot === null || typeof snapshot !== "object") {
    fail("Expected machine snapshot");
  }

  return Object.freeze({
    value: snapshot.value,
    context: snapshot.context,
    status: "active",
  });
}
