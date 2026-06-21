import { applyMutationResult } from "@ts-zero/mutation/apply";
import { createMutationRequest, getMutationResult } from "@ts-zero/mutation/protocol";
import type { CounterRuntimeOperation, CounterRuntimeResult, CounterStore, Routes } from "../shared/types.js";

export interface CounterClient {
  readonly dispatch: (operation: CounterRuntimeOperation, payload?: number) => Promise<CounterRuntimeResult>;
}

export function createCounterClient({
  endpoint,
  store,
}: {
  readonly endpoint: string;
  readonly store: CounterStore;
}): CounterClient {
  return {
    async dispatch(operation, payload) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify(createMutationRequest(store.version(), operation, payload)),
      });

      if (!response.ok) {
        throw new Error(`Counter mutation failed with HTTP ${response.status}`);
      }

      const result = getMutationResult(await response.json()) as CounterRuntimeResult;
      applyCounterResult(store, result);
      return result;
    },
  };
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
