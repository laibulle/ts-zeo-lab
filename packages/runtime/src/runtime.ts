import { fail, RuntimeError } from "./errors.js";
import { assertSerializable } from "./serializable.js";
import type { HostMessage, Runtime, RuntimeMessage, RuntimeOptions, Serializable, Unsubscribe } from "./types.js";

interface PendingRequest {
  readonly resolve: (value: Serializable | undefined) => void;
  readonly reject: (reason: RuntimeError) => void;
}

export function createRuntime(options: RuntimeOptions): Runtime {
  validateOptions(options);

  const pending = new Map<string, PendingRequest>();
  const listeners: Array<(message: HostMessage) => void> = [];
  const createId = options.createId ?? createMonotonicId();
  let active = true;
  let unsubscribeChannel: Unsubscribe = () => undefined;

  const runtime: Runtime = {
    request(capability, operation, payload) {
      assertActive(active);
      validateName(capability, "capability");
      validateName(operation, "operation");

      if (payload !== undefined) {
        assertSerializable(payload, "request payload");
      }

      const id = createId();

      if (pending.has(id)) {
        fail(`Duplicate request id: ${id}`);
      }

      const message: RuntimeMessage = {
        kind: "request",
        id,
        capability,
        operation,
        ...(payload === undefined ? {} : { payload }),
      };

      assertSerializable(message, "runtime request");

      const promise = new Promise<Serializable | undefined>((resolve, reject) => {
        pending.set(id, {
          resolve,
          reject,
        });
      });

      try {
        options.channel.send(message);
      } catch (error) {
        pending.delete(id);
        throw error;
      }

      return promise;
    },
    emit(name, payload) {
      assertActive(active);
      validateName(name, "event name");

      if (payload !== undefined) {
        assertSerializable(payload, "event payload");
      }

      const message: RuntimeMessage = {
        kind: "event",
        name,
        ...(payload === undefined ? {} : { payload }),
      };

      options.channel.send(message);
    },
    receive(message) {
      assertSerializable(message, "host message");
      validateHostMessage(message);

      if (message.kind === "response") {
        receiveResponse(message);
      } else {
        notify(message);
      }
    },
    subscribe(listener) {
      if (typeof listener !== "function") {
        fail("Expected listener to be a function");
      }

      listeners.push(listener);

      return (() => {
        const index = listeners.indexOf(listener);

        if (index !== -1) {
          listeners.splice(index, 1);
        }
      }) as Unsubscribe;
    },
    destroy(reason = "Runtime destroyed") {
      if (!active) {
        return;
      }

      active = false;
      unsubscribeChannel();
      const error = new RuntimeError(reason);

      for (const request of pending.values()) {
        request.reject(error);
      }

      pending.clear();
      listeners.length = 0;
    },
  };

  unsubscribeChannel = options.channel.subscribe((message) => {
    runtime.receive(message);
  });

  return runtime;

  function receiveResponse(message: HostMessage & { readonly kind: "response" }): void {
    validateName(message.id, "response id");
    const request = pending.get(message.id);

    if (request === undefined) {
      fail(`Unknown response id: ${message.id}`);
    }

    pending.delete(message.id);

    if (message.ok) {
      request.resolve(message.value);
      return;
    }

    request.reject(new RuntimeError(message.error ?? "Runtime request failed"));
  }

  function notify(message: HostMessage): void {
    for (const listener of listeners.slice()) {
      listener(message);
    }
  }
}

function validateOptions(options: RuntimeOptions): void {
  if (options === null || typeof options !== "object") {
    fail("Expected runtime options");
  }

  if (options.channel === null || typeof options.channel !== "object") {
    fail("Expected host channel");
  }

  if (typeof options.channel.send !== "function" || typeof options.channel.subscribe !== "function") {
    fail("Expected host channel to expose send and subscribe");
  }

  if (options.createId !== undefined && typeof options.createId !== "function") {
    fail("Expected createId to be a function");
  }
}

function validateHostMessage(message: HostMessage): void {
  if (message.kind === "response") {
    validateName(message.id, "response id");

    if (typeof message.ok !== "boolean") {
      fail("Expected response ok to be a boolean");
    }

    if (message.error !== undefined && typeof message.error !== "string") {
      fail("Expected response error to be a string");
    }

    return;
  }

  if (message.kind === "event") {
    validateName(message.name, "host event name");
    return;
  }

  fail("Expected host message kind to be response or event");
}

function validateName(value: string, label: string): void {
  if (typeof value !== "string" || value.length === 0) {
    fail(`Expected ${label} to be a non-empty string`);
  }
}

function assertActive(active: boolean): void {
  if (!active) {
    fail("Runtime is destroyed");
  }
}

function createMonotonicId(): () => string {
  let next = 0;

  return () => {
    next += 1;
    return `runtime:${next}`;
  };
}
