import { performance } from "node:perf_hooks";

import * as uuid from "../dist/index.js";
import { createCases, formatNumber, iterations, pad, padLeft, runLoop, samples, warmup } from "./_shared.mjs";

const cases = createCases(uuid);

console.log(`@ts-zero/uuid generation benchmark`);
console.log(`iterations=${iterations.toLocaleString("en-US")} samples=${samples} warmup=${warmup.toLocaleString("en-US")}`);
console.log("");
console.log(`${pad("case", 14)} ${padLeft("ops/sec", 14)} ${padLeft("ns/op", 12)} ${padLeft("best ms", 10)}`);
console.log(`${"-".repeat(14)} ${"-".repeat(14)} ${"-".repeat(12)} ${"-".repeat(10)}`);

for (const [name, fn] of cases) {
  runLoop(fn, warmup);

  const timings = [];

  for (let sample = 0; sample < samples; sample += 1) {
    const start = performance.now();
    runLoop(fn, iterations);
    timings.push(performance.now() - start);
  }

  const bestMs = Math.min(...timings);
  const bestOps = iterations / (bestMs / 1000);
  const nsPerOp = (bestMs * 1_000_000) / iterations;

  console.log(
    `${pad(name, 14)} ${padLeft(formatNumber(bestOps), 14)} ${padLeft(formatNumber(nsPerOp), 12)} ${padLeft(bestMs.toFixed(2), 10)}`,
  );
}
