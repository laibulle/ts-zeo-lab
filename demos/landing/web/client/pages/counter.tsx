import { createSignal, For, onCleanup, onMount } from "solid-js";
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
  const [log, setLog] = createSignal<readonly CounterLogEntry[]>([
    {
      id: 0,
      label: streams ? "SSE stream available in this runtime" : "Serverless mode: protocol replay without durable stream",
    },
  ]);

  let nextLogId = 1;

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
    void client.dispatch(operation, payload).then((result) => {
      recordResult("POST /counter/actions", result);
    });
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
    </section>
  );
}
