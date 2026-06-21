import { createSignal, For, onCleanup, onMount } from "solid-js";
import type { PendingMutation, ReconcileResult } from "@ts-zero/mutation/types";
import { connectCounterStream } from "../counter-mutations.js";
import { useStoreState } from "../solid-store.js";
import type { CounterClient } from "../counter-mutations.js";
import type { CounterRuntimeResult, CounterStore, Routes } from "../../shared/types.js";

interface CounterLogEntry {
  readonly id: number;
  readonly label: string;
}

export function CounterPage({
  client,
  routes,
  store,
  streams,
}: {
  readonly client: CounterClient;
  readonly routes: Routes;
  readonly store: CounterStore;
  readonly streams: boolean;
}) {
  const state = useStoreState(store);
  const [offline, setOffline] = createSignal(false);
  const [queue, setQueue] = createSignal<readonly PendingMutation<number>[]>([]);
  const [log, setLog] = createSignal<readonly CounterLogEntry[]>([
    {
      id: 0,
      label: streams ? "SSE stream available in this runtime" : "Serverless mode: protocol replay without durable stream",
    },
  ]);

  let nextLogId = 1;
  let nextActionId = 1;
  let offlineBaseVersion = store.version();
  const clientId = `counter-client-${Math.random().toString(36).slice(2)}`;

  const pushLog = (label: string) => {
    setLog((entries) => [
      {
        id: nextLogId++,
        label,
      },
      ...entries,
    ].slice(0, 6));
  };

  const recordResult = (source: string, result: CounterRuntimeResult) => {
    pushLog(result.kind === "action"
      ? `${source}: ${result.action.type} ${result.previousVersion} -> ${result.version}`
      : `${source}: snapshot v${result.snapshot.version}`);
  };

  const run = (operation: "increment" | "reset", payload?: number) => {
    if (offline()) {
      const pending = client.queueAction(`offline-${nextActionId++}`, operation, payload);
      setQueue((items) => [...items, pending]);
      pushLog(`offline queue: ${pending.action.type} at v${pending.baseVersion}`);
      return;
    }

    void client.dispatch(operation, payload).then((result) => {
      recordResult("POST /counter/actions", result);
    });
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

  const simulateServerAdvance = () => {
    void client.dispatchRemoteOnly("increment", 1, offline() ? offlineBaseVersion : store.version()).then((result) => {
      recordResult("remote server advance", result);
    });
  };

  const recordReconcileResult = (result: ReconcileResult) => {
    if (result.kind === "accepted") {
      pushLog(`reconcile accepted: ${result.accepted.length} action(s), server v${result.version}`);
      return;
    }

    pushLog(`reconcile snapshot: accepted ${result.accepted.length}, rejected ${result.rejected.length}`);
  };

  onMount(() => {
    if (!streams) {
      return;
    }

    const disconnect = connectCounterStream({
      onMessage: (result) => recordResult("SSE /counter/events", result),
      routes,
      store,
    });

    onCleanup(disconnect);
  });

  return (
    <section class="counter-demo" aria-label="Distributed counter">
      <div class="counter-panel">
        <p class="eyebrow">distributed state</p>
        <div class="counter-value">{state().value}</div>
        <div class="counter-version">server version {store.version()}</div>
        <div class="counter-actions">
          <button type="button" onClick={() => run("increment", 1)}>+1</button>
          <button class="secondary" type="button" onClick={() => run("increment", -1)}>-1</button>
          <button class="danger" type="button" onClick={() => run("reset")}>Reset</button>
        </div>
        <div class="counter-actions">
          <button
            class="secondary"
            type="button"
            onClick={() => {
              offlineBaseVersion = store.version();
              setOffline(true);
              pushLog(`offline: base server version ${offlineBaseVersion}`);
            }}
            disabled={offline()}
          >
            Go offline
          </button>
          <button type="button" onClick={reconnect} disabled={!offline()}>Reconnect</button>
          <button class="secondary" type="button" onClick={simulateServerAdvance}>Server +1</button>
        </div>
      </div>

      <div class="counter-flow">
        <div><span>1</span><strong>Client action</strong><p>POST sends version + action.</p></div>
        <div><span>2</span><strong>Server state</strong><p>The server applies the action if the version is current.</p></div>
        <div><span>3</span><strong>{streams ? "Live patch" : "Replay result"}</strong><p>{streams ? "SSE broadcasts compact updates to peers." : "Serverless returns the protocol result to this request."}</p></div>
      </div>

      <div class="transport-log">
        <div class="transport-heading">
          <strong>Transport log</strong>
          <span>{streams ? "live runtime" : "serverless-safe"}</span>
        </div>
        <For each={log()}>
          {(entry) => <p>{entry.label}</p>}
        </For>
      </div>

      <div class="offline-queue">
        <div class="transport-heading">
          <strong>Offline queue</strong>
          <span>{offline() ? "offline" : "online"}</span>
        </div>
        <For each={queue()} fallback={<p>No pending actions.</p>}>
          {(action) => (
            <p>
              {action.id}: {action.action.type}
              {action.action.payload === undefined ? "" : `(${action.action.payload})`} at v{action.baseVersion}
            </p>
          )}
        </For>
      </div>
    </section>
  );
}

function acceptedIds(result: ReconcileResult): Set<string> {
  return new Set(result.accepted);
}
