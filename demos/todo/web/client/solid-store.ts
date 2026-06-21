import { createSignal, onCleanup, type Accessor } from "solid-js";
import type { Store } from "@ts-zero/store";

export function useStoreState<State>(store: Store<State>): Accessor<State> {
  const [state, setState] = createSignal(store.getState(), { equals: false });
  const unsubscribe = store.subscribe((value) => value, (next) => {
    setState(() => next);
  });

  onCleanup(unsubscribe);

  return state;
}
