import { createMemo } from "solid-js";
import { StatsMetrics } from "../components/stats-metrics.js";
import { useStoreState } from "../solid-store.js";
import { selectStats } from "../todo-store.js";
import type { TodoStore } from "../../shared/types.js";

export function StatsPage({ store }: { readonly store: TodoStore }) {
  const state = useStoreState(store);
  const stats = createMemo(() => selectStats(state()));

  return <StatsMetrics stats={stats()} />;
}
