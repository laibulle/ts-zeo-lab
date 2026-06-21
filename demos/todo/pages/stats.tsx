import { select } from "@ts-zero/html/bindings";
import type { HtmlChild } from "@ts-zero/html/types";
import { StatsMetrics } from "../components/stats-metrics.js";
import { selectStats } from "./todo-store.js";
import type { TodoStore } from "./types.js";

export function StatsPage({ store }: { readonly store: TodoStore }): HtmlChild {
  return select(store, selectStats, (stats) => <StatsMetrics stats={stats} />);
}
