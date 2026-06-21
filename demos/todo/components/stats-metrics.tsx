import type { HtmlChild } from "@ts-zero/html/types";

export interface TodoStatsMetrics {
  readonly total: number;
  readonly remaining: number;
  readonly completed: number;
  readonly progress: number;
}

export function StatsMetrics({ stats }: { readonly stats: TodoStatsMetrics }): HtmlChild {
  return (
    <>
      <section class="stats" aria-label="Todo stats">
        <div class="metric"><strong>Total</strong><span>{stats.total}</span></div>
        <div class="metric"><strong>Open</strong><span>{stats.remaining}</span></div>
        <div class="metric"><strong>Done</strong><span>{stats.completed}</span></div>
      </section>
      <div class="metric" style="margin-top: 10px;">
        <strong>Progress</strong>
        <span>{stats.progress}%</span>
        <progress value={stats.completed} max={Math.max(stats.total, 1)} />
      </div>
    </>
  );
}
