import { createStore } from "@ts-zero/store/create";
import type { CounterSnapshot, CounterState, CounterStore } from "../shared/types.js";

export function createCounterStore(snapshot: CounterSnapshot): CounterStore {
  return createStore<CounterState>({
    freeze: true,
    state: snapshot.state,
    version: snapshot.version,
    transitions: {
      incrementCounter: (state, delta: unknown) => ({
        value: state.value + normalizeDelta(delta),
      }),
      resetCounter: () => ({
        value: 0,
      }),
    },
  });
}

function normalizeDelta(delta: unknown): number {
  return delta === 1 || delta === -1 ? delta : 1;
}
