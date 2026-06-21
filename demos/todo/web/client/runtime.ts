import { createRuntime } from "@ts-zero/runtime/runtime";
import type { HostChannel, HostMessage, RuntimeMessage, Serializable } from "@ts-zero/runtime/types";
import type { Snapshot, TodoRuntimeOperation, TodoStore } from "../shared/types.js";

export interface TodoWebRuntime {
  readonly dispatch: (operation: TodoRuntimeOperation, payload?: Serializable) => Promise<Snapshot>;
  readonly destroy: () => void;
}

export function createTodoWebRuntime({
  endpoint,
  store,
}: {
  readonly endpoint: string;
  readonly store: TodoStore;
}): TodoWebRuntime {
  const channel = createFetchHostChannel(endpoint);
  const runtime = createRuntime({ channel });

  return {
    async dispatch(operation, payload) {
      const value = await runtime.request("todo", operation, payload);
      const snapshot = asSnapshot(value);
      store.hydrate(snapshot);
      return snapshot;
    },
    destroy() {
      runtime.destroy();
    },
  };
}

function createFetchHostChannel(endpoint: string): HostChannel {
  const listeners: Array<(message: HostMessage) => void> = [];

  return {
    send(message) {
      void sendMessage(endpoint, message, listeners);
    },
    subscribe(listener) {
      listeners.push(listener);

      return () => {
        const index = listeners.indexOf(listener);

        if (index !== -1) {
          listeners.splice(index, 1);
        }
      };
    },
  };
}

async function sendMessage(
  endpoint: string,
  message: RuntimeMessage,
  listeners: readonly ((message: HostMessage) => void)[],
): Promise<void> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "accept": "application/json",
    },
    body: JSON.stringify(message),
  });

  const hostMessage = await response.json() as HostMessage;

  for (const listener of listeners.slice()) {
    listener(hostMessage);
  }
}

function asSnapshot(value: Serializable | undefined): Snapshot {
  if (value === undefined || value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Expected runtime response to contain a todo snapshot");
  }

  const snapshot = value as Partial<Snapshot>;

  if (typeof snapshot.version !== "number" || snapshot.state === undefined) {
    throw new Error("Expected runtime response to contain a todo snapshot");
  }

  return snapshot as Snapshot;
}
