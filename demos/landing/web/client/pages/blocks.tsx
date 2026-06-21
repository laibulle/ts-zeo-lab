import { createMemo, createSignal, For, onCleanup, onMount } from "solid-js";
import type { PendingMutation, ReconcileResult } from "@ts-zero/mutation/types";
import {
  connectBlocksStream,
  createEditBlockPayload,
  createInsertBlockPayload,
} from "../blocks-mutations.js";
import { selectBlocks } from "../blocks-store.js";
import { useStoreState } from "../solid-store.js";
import type { BlocksClient } from "../blocks-mutations.js";
import type { BlocksMutationPayload, BlocksRuntimeResult, BlocksStore, Routes } from "../../shared/types.js";

interface BlocksLogEntry {
  readonly id: number;
  readonly label: string;
}

const actor = "local editor";
const remoteActor = "remote collaborator";

export function BlocksPage({
  client,
  routes,
  store,
  streams,
}: {
  readonly client: BlocksClient;
  readonly routes: Routes;
  readonly store: BlocksStore;
  readonly streams: boolean;
}) {
  const state = useStoreState(store);
  const blocks = createMemo(() => selectBlocks(state()));
  const [offline, setOffline] = createSignal(false);
  const [queue, setQueue] = createSignal<readonly PendingMutation<BlocksMutationPayload>[]>([]);
  const [log, setLog] = createSignal<readonly BlocksLogEntry[]>([
    { id: 0, label: "Document loaded from SSR snapshot" },
  ]);

  let nextLogId = 1;
  let nextActionId = 1;
  let nextBlockId = 1;
  let offlineBaseVersion = store.version();
  const editTimers = new Map<string, number>();
  const clientId = `blocks-client-${Math.random().toString(36).slice(2)}`;

  const pushLog = (label: string) => {
    setLog((entries) => [
      { id: nextLogId++, label },
      ...entries,
    ].slice(0, 8));
  };

  const run = (operation: "edit" | "insertAfter", payload: BlocksMutationPayload) => {
    if (offline()) {
      const pending = client.queueAction(`block-offline-${nextActionId++}`, operation, payload);
      setQueue((items) => [...items, pending]);
      pushLog(`queued ${pending.action.type} at document v${pending.baseVersion}`);
      return;
    }

    void client.dispatch(operation, payload).then((result) => {
      pushLog(result.kind === "action" ? `${operation} accepted: v${result.previousVersion} -> v${result.version}` : `${operation} returned snapshot`);
    });
  };

  const editBlock = (id: string, text: string) => {
    run("edit", createEditBlockPayload(id, text, actor));
  };

  const scheduleEditBlock = (id: string, text: string) => {
    const currentTimer = editTimers.get(id);

    if (currentTimer !== undefined) {
      window.clearTimeout(currentTimer);
    }

    editTimers.set(id, window.setTimeout(() => {
      editTimers.delete(id);
      editBlock(id, text);
    }, 180));
  };

  const insertAfter = (afterId: string | null) => {
    run("insertAfter", createInsertBlockPayload(`local-${nextBlockId++}`, afterId, "New offline-ready block", actor));
  };

  const goOffline = () => {
    offlineBaseVersion = store.version();
    setOffline(true);
    pushLog(`offline from document v${offlineBaseVersion}`);
  };

  const reconnect = () => {
    const actions = queue();

    if (actions.length === 0) {
      setOffline(false);
      pushLog("reconnect: queue empty");
      return;
    }

    void client.reconcile(clientId, offlineBaseVersion, actions).then((result) => {
      recordReconcileResult(result);
      setQueue((items) => items.filter((item) => !acceptedIds(result).has(item.id)));
      setOffline(false);
    });
  };

  const simulateRemoteEdit = () => {
    const first = blocks()[0];

    if (first === undefined) {
      return;
    }

    const payload = createEditBlockPayload(first.id, `${first.text} + remote edit`, remoteActor);

    void client.dispatchRemoteOnly("edit", payload, offline() ? offlineBaseVersion : store.version()).then((result) => {
      pushLog(result.kind === "action" ? `remote edited ${first.id}: server v${result.version}` : "remote edit returned snapshot");
    });
  };

  const recordReconcileResult = (result: ReconcileResult) => {
    if (result.kind === "accepted") {
      pushLog(`reconcile accepted ${result.accepted.length} action(s), server v${result.version}`);
      return;
    }

    pushLog(`reconcile snapshot: accepted ${result.accepted.length}, rejected ${result.rejected.length}`);
  };

  const recordStreamResult = (result: BlocksRuntimeResult) => {
    if (offline()) {
      pushLog("live event held while offline");
      return;
    }

    pushLog(result.kind === "action" ? `live ${result.action.type}: server v${result.version}` : "live snapshot applied");
  };

  onMount(() => {
    if (!streams) {
      return;
    }

    const disconnect = connectBlocksStream({
      onMessage: recordStreamResult,
      routes,
      shouldApply: () => !offline(),
      store,
    });

    onCleanup(disconnect);
  });

  onCleanup(() => {
    for (const timer of editTimers.values()) {
      window.clearTimeout(timer);
    }
  });

  return (
    <section class="blocks-demo" aria-label="Collaborative blocks">
      <div class="blocks-toolbar">
        <div>
          <p class="eyebrow">collaborative document</p>
          <h3>Offline block editing with server reconciliation</h3>
          <p>
            Edit blocks locally, simulate a concurrent collaborator, then reconnect. Inserts can merge;
            stale edits to the same block are rejected and repaired by a snapshot.
          </p>
        </div>
        <div class="counter-actions">
          <button class="secondary" type="button" onClick={goOffline} disabled={offline()}>Go offline</button>
          <button type="button" onClick={reconnect} disabled={!offline()}>Reconnect</button>
          <button class="secondary" type="button" onClick={simulateRemoteEdit}>Remote edit</button>
        </div>
      </div>

      <div class="blocks-shell">
        <div class="blocks-editor">
          <div class="transport-heading">
            <strong>Document</strong>
            <span>{offline() ? "offline" : streams ? "live" : "serverless"} · v{store.version()}</span>
          </div>
          <For each={state().order}>
            {(id) => {
              const block = createMemo(() => state().blocks[id]);

              return (
                <article class="block-row">
                  <textarea
                    value={block()?.text ?? ""}
                    onInput={(event) => scheduleEditBlock(id, event.currentTarget.value)}
                    aria-label={`Edit ${id}`}
                  />
                  <div class="block-meta">
                    <span>{id}</span>
                    <span>block v{block()?.version ?? 0}</span>
                    <span>{block()?.updatedBy ?? "unknown"}</span>
                  </div>
                  <button class="secondary" type="button" onClick={() => insertAfter(id)}>Insert after</button>
                </article>
              );
            }}
          </For>
          <button type="button" onClick={() => insertAfter(null)}>Insert at top</button>
        </div>

        <div class="offline-queue">
          <div class="transport-heading">
            <strong>Offline queue</strong>
            <span>{queue().length} pending</span>
          </div>
          <For each={queue()} fallback={<p>No pending block actions.</p>}>
            {(action) => <p>{action.id}: {action.action.type} at v{action.baseVersion}</p>}
          </For>
        </div>

        <div class="transport-log">
          <div class="transport-heading">
            <strong>Reconciliation log</strong>
            <span>block-aware</span>
          </div>
          <For each={log()}>
            {(entry) => <p>{entry.label}</p>}
          </For>
        </div>
      </div>
    </section>
  );
}

function acceptedIds(result: ReconcileResult): Set<string> {
  return new Set(result.accepted);
}
