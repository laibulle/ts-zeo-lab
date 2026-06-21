import { applyMutationResult } from "@ts-zero/mutation/apply";
import { createMutationRequest, getMutationResult } from "@ts-zero/mutation/protocol";
import { createPendingMutation, createReconcileRequest, getReconcileResult } from "@ts-zero/mutation/reconcile";
import type { PendingMutation, ReconcileResult } from "@ts-zero/mutation/types";
import type { CounterRuntimeOperation, CounterRuntimeResult, CounterStore, Routes } from "../shared/types.js";

export interface CounterClient {
  readonly dispatch: (operation: CounterRuntimeOperation, payload?: number) => Promise<CounterRuntimeResult>;
  readonly dispatchRemoteOnly: (operation: CounterRuntimeOperation, payload?: number, version?: number) => Promise<CounterRuntimeResult>;
  readonly reconcile: (clientId: string, lastSeenVersion: number, actions: readonly PendingMutation<number>[]) => Promise<ReconcileResult>;
  readonly queueAction: (id: string, operation: CounterRuntimeOperation, payload?: number) => PendingMutation<number>;
}

export function createCounterClient({
  endpoint,
  reconcileEndpoint,
  store,
}: {
  readonly endpoint: string;
  readonly reconcileEndpoint: string;
  readonly store: CounterStore;
}): CounterClient {
  return {
    async dispatch(operation, payload) {
      const result = await sendMutation(endpoint, store.version(), operation, payload);
      applyCounterResult(store, result);
      return result;
    },
    async dispatchRemoteOnly(operation, payload, version = store.version()) {
      return sendMutation(endpoint, version, operation, payload);
    },
    async reconcile(clientId, lastSeenVersion, actions) {
      const response = await fetch(reconcileEndpoint, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify(createReconcileRequest({
          clientId,
          lastSeenVersion,
          actions,
        })),
      });

      if (!response.ok) {
        throw new Error(`Counter reconcile failed with HTTP ${response.status}`);
      }

      const result = getReconcileResult(await response.json());

      if (result.kind === "snapshot") {
        store.hydrate(result.snapshot as ReturnType<CounterStore["snapshot"]>);
      }

      return result;
    },
    queueAction(id, operation, payload) {
      const pending = createPendingMutation<number>({
        id,
        baseVersion: store.version(),
        action: {
          type: operation,
          ...(payload === undefined ? {} : { payload }),
        },
        createdAt: Date.now(),
      });

      applyOptimisticAction(store, operation, payload);
      return pending;
    },
  };
}

async function sendMutation(
  endpoint: string,
  version: number,
  operation: CounterRuntimeOperation,
  payload?: number,
): Promise<CounterRuntimeResult> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(createMutationRequest(version, operation, payload)),
  });

  if (!response.ok) {
    throw new Error(`Counter mutation failed with HTTP ${response.status}`);
  }

  return getMutationResult(await response.json()) as CounterRuntimeResult;
}

function applyOptimisticAction(store: CounterStore, operation: CounterRuntimeOperation, payload?: number): void {
  if (operation === "increment") {
    store.dispatch("incrementCounter", payload);
    return;
  }

  store.dispatch("resetCounter", 0);
}

export function connectCounterStream({
  onMessage,
  routes,
  store,
}: {
  readonly onMessage: (result: CounterRuntimeResult) => void;
  readonly routes: Routes;
  readonly store: CounterStore;
}): () => void {
  const source = new EventSource(routes.counterEvents);

  source.addEventListener("counter", (event) => {
    const result = getMutationResult(JSON.parse(event.data)) as CounterRuntimeResult;
    onMessage(result);
    applyCounterResult(store, result);
  });

  source.addEventListener("error", () => {
    source.close();
  });

  return () => source.close();
}

function applyCounterResult(store: CounterStore, result: CounterRuntimeResult): void {
  if (result.kind === "snapshot") {
    if (result.snapshot.version <= store.version()) {
      return;
    }

    applyMutationResult(store, result);
    return;
  }

  if (result.version <= store.version()) {
    return;
  }

  applyMutationResult(store, result);
}
