import { applyMutationResult } from "@ts-zero/mutation/apply";
import { createMutationRequest, getMutationResult } from "@ts-zero/mutation/protocol";
import type { Snapshot, TodoRuntimeOperation, TodoRuntimeResult, TodoStore } from "../shared/types.js";

export interface TodoMutationClient {
  readonly dispatch: (operation: TodoRuntimeOperation, payload?: unknown) => Promise<Snapshot>;
}

export function createTodoMutationClient({
  endpoint,
  store,
}: {
  readonly endpoint: string;
  readonly store: TodoStore;
}): TodoMutationClient {
  return {
    async dispatch(operation, payload) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "accept": "application/json",
        },
        body: JSON.stringify(createMutationRequest(store.version(), operation, payload)),
      });
      const value = await response.json() as unknown;
      return applyMutationResult(store, getMutationResult(value) as TodoRuntimeResult);
    },
  };
}
