import { assertSerializable } from "./serializable.js";
import type { HostChannel, HostMessage, RuntimeMessage, Unsubscribe } from "./types.js";

export function createMemoryHostChannel(options: {
  readonly onRuntimeMessage?: (message: RuntimeMessage) => void;
} = {}): HostChannel & { receive(message: HostMessage): void } {
  const listeners: Array<(message: HostMessage) => void> = [];

  return {
    send(message) {
      assertSerializable(message, "runtime message");
      options.onRuntimeMessage?.(message);
    },
    subscribe(listener) {
      listeners.push(listener);

      return (() => {
        const index = listeners.indexOf(listener);

        if (index !== -1) {
          listeners.splice(index, 1);
        }
      }) as Unsubscribe;
    },
    receive(message) {
      assertSerializable(message, "host message");

      for (const listener of listeners.slice()) {
        listener(message);
      }
    },
  };
}
