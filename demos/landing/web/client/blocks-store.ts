import { createStore } from "@ts-zero/store/create";
import type {
  Block,
  BlocksSnapshot,
  BlocksState,
  BlocksStore,
  DeleteBlockPayload,
  EditBlockPayload,
  InsertBlockPayload,
  MoveBlockPayload,
} from "../shared/types.js";

export function createBlocksStore(snapshot: BlocksSnapshot): BlocksStore {
  return createStore<BlocksState>({
    freeze: true,
    state: snapshot.state,
    version: snapshot.version,
    transitions: {
      editBlock: (state, payload: unknown) => editBlock(state, payload),
      insertBlock: (state, payload: unknown) => insertBlock(state, payload),
      moveBlock: (state, payload: unknown) => moveBlock(state, payload),
      deleteBlock: (state, payload: unknown) => deleteBlock(state, payload),
    },
  });
}

export function selectBlocks(state: BlocksState): readonly Block[] {
  return state.order.map((id) => state.blocks[id]).filter((block): block is Block => block !== undefined);
}

function editBlock(state: BlocksState, payload: unknown): BlocksState {
  if (!isEditBlockPayload(payload) || state.blocks[payload.id] === undefined) {
    return state;
  }

  return {
    ...state,
    blocks: {
      ...state.blocks,
      [payload.id]: {
        ...state.blocks[payload.id],
        text: payload.text,
        version: state.blocks[payload.id].version + 1,
        updatedBy: payload.actor,
      },
    },
  };
}

function insertBlock(state: BlocksState, payload: unknown): BlocksState {
  if (!isInsertBlockPayload(payload) || state.blocks[payload.id] !== undefined) {
    return state;
  }

  const index = insertionIndex(state.order, payload.afterId);
  const block: Block = {
    id: payload.id,
    text: payload.text,
    version: 1,
    updatedBy: payload.actor,
  };

  return {
    order: [
      ...state.order.slice(0, index),
      block.id,
      ...state.order.slice(index),
    ],
    blocks: {
      ...state.blocks,
      [block.id]: block,
    },
  };
}

function moveBlock(state: BlocksState, payload: unknown): BlocksState {
  if (!isMoveBlockPayload(payload) || state.blocks[payload.id] === undefined) {
    return state;
  }

  const withoutBlock = state.order.filter((id) => id !== payload.id);
  const index = insertionIndex(withoutBlock, payload.afterId);

  return {
    ...state,
    order: [
      ...withoutBlock.slice(0, index),
      payload.id,
      ...withoutBlock.slice(index),
    ],
  };
}

function deleteBlock(state: BlocksState, payload: unknown): BlocksState {
  if (!isDeleteBlockPayload(payload) || state.blocks[payload.id] === undefined) {
    return state;
  }

  const { [payload.id]: _removed, ...blocks } = state.blocks;

  return {
    order: state.order.filter((id) => id !== payload.id),
    blocks,
  };
}

function insertionIndex(order: readonly string[], afterId: string | null): number {
  if (afterId === null) {
    return 0;
  }

  const index = order.indexOf(afterId);
  return index === -1 ? order.length : index + 1;
}

function isEditBlockPayload(payload: unknown): payload is EditBlockPayload {
  return isRecord(payload)
    && typeof payload.id === "string"
    && typeof payload.text === "string"
    && typeof payload.actor === "string";
}

function isInsertBlockPayload(payload: unknown): payload is InsertBlockPayload {
  return isRecord(payload)
    && typeof payload.id === "string"
    && (payload.afterId === null || typeof payload.afterId === "string")
    && typeof payload.text === "string"
    && typeof payload.actor === "string";
}

function isMoveBlockPayload(payload: unknown): payload is MoveBlockPayload {
  return isRecord(payload)
    && typeof payload.id === "string"
    && (payload.afterId === null || typeof payload.afterId === "string")
    && typeof payload.actor === "string";
}

function isDeleteBlockPayload(payload: unknown): payload is DeleteBlockPayload {
  return isRecord(payload)
    && typeof payload.id === "string"
    && typeof payload.actor === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
