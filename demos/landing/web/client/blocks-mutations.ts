import { applyMutationResult } from "@ts-zero/mutation/apply";
import { createMutationRequest, getMutationResult } from "@ts-zero/mutation/protocol";
import { createPendingMutation, createReconcileRequest, getReconcileResult } from "@ts-zero/mutation/reconcile";
import type { PendingMutation, ReconcileResult } from "@ts-zero/mutation/types";
import type {
  BlocksMutationPayload,
  BlocksRuntimeOperation,
  BlocksRuntimeResult,
  BlocksStore,
  DeleteBlockPayload,
  EditBlockPayload,
  InsertBlockPayload,
  MoveBlockPayload,
  Routes,
} from "../shared/types.js";

export interface BlocksClient {
  readonly dispatch: (operation: BlocksRuntimeOperation, payload: BlocksMutationPayload) => Promise<BlocksRuntimeResult>;
  readonly dispatchRemoteOnly: (operation: BlocksRuntimeOperation, payload: BlocksMutationPayload, version?: number) => Promise<BlocksRuntimeResult>;
  readonly reconcile: (clientId: string, lastSeenVersion: number, actions: readonly PendingMutation<BlocksMutationPayload>[]) => Promise<ReconcileResult>;
  readonly queueAction: (id: string, operation: BlocksRuntimeOperation, payload: BlocksMutationPayload) => PendingMutation<BlocksMutationPayload>;
}

export function createBlocksClient({
  endpoint,
  reconcileEndpoint,
  store,
}: {
  readonly endpoint: string;
  readonly reconcileEndpoint: string;
  readonly store: BlocksStore;
}): BlocksClient {
  return {
    async dispatch(operation, payload) {
      const result = await sendMutation(endpoint, store.version(), operation, payload);
      applyBlocksResult(store, result);
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
        throw new Error(`Blocks reconcile failed with HTTP ${response.status}`);
      }

      const result = getReconcileResult(await response.json());

      if (result.kind === "snapshot") {
        store.hydrate(result.snapshot as ReturnType<BlocksStore["snapshot"]>);
      }

      return result;
    },
    queueAction(id, operation, payload) {
      const pending = createPendingMutation<BlocksMutationPayload>({
        id,
        baseVersion: store.version(),
        action: {
          type: operation,
          payload,
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
  operation: BlocksRuntimeOperation,
  payload: BlocksMutationPayload,
): Promise<BlocksRuntimeResult> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(createMutationRequest(version, operation, payload)),
  });

  if (!response.ok) {
    throw new Error(`Blocks mutation failed with HTTP ${response.status}`);
  }

  return getMutationResult(await response.json()) as BlocksRuntimeResult;
}

function applyOptimisticAction(store: BlocksStore, operation: BlocksRuntimeOperation, payload: BlocksMutationPayload): void {
  store.dispatch(operationToTransition(operation), payload);
}

function applyBlocksResult(store: BlocksStore, result: BlocksRuntimeResult): void {
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

export function operationToTransition(operation: BlocksRuntimeOperation): "editBlock" | "insertBlock" | "moveBlock" | "deleteBlock" {
  if (operation === "edit") {
    return "editBlock";
  }

  if (operation === "insertAfter") {
    return "insertBlock";
  }

  if (operation === "moveAfter") {
    return "moveBlock";
  }

  return "deleteBlock";
}

export function connectBlocksStream({
  onMessage,
  routes,
  shouldApply,
  store,
}: {
  readonly onMessage: (result: BlocksRuntimeResult) => void;
  readonly routes: Routes;
  readonly shouldApply?: () => boolean;
  readonly store: BlocksStore;
}): () => void {
  const source = new EventSource(routes.blocksEvents);

  source.addEventListener("blocks", (event) => {
    const result = getMutationResult(JSON.parse(event.data)) as BlocksRuntimeResult;
    onMessage(result);

    if (shouldApply?.() === false) {
      return;
    }

    applyBlocksResult(store, result);
  });

  source.addEventListener("error", () => {
    source.close();
  });

  return () => source.close();
}

export function createEditBlockPayload(id: string, text: string, actor: string): EditBlockPayload {
  return { id, text, actor };
}

export function createInsertBlockPayload(id: string, afterId: string | null, text: string, actor: string): InsertBlockPayload {
  return { id, afterId, text, actor };
}

export function createMoveBlockPayload(id: string, afterId: string | null, actor: string): MoveBlockPayload {
  return { id, afterId, actor };
}

export function createDeleteBlockPayload(id: string, actor: string): DeleteBlockPayload {
  return { id, actor };
}
