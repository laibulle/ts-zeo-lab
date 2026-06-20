import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";

import * as localUuid from "../dist/index.js";
import { deterministicRandom, formatNumber, pad, padLeft, readIntegerEnv, runLoop } from "./_shared.mjs";

const iterations = readIntegerEnv("UUID_V7_BENCH_ITERATIONS", 250_000);
const samples = readIntegerEnv("UUID_V7_BENCH_SAMPLES", 13);
const warmup = readIntegerEnv("UUID_V7_BENCH_WARMUP", 25_000);
const referenceVersion = process.env.UUID_REFERENCE_VERSION ?? "14.0.1";
const referenceRoot =
  process.env.UUID_REFERENCE_ROOT ?? join(tmpdir(), `ts-zero-uuid-reference-${referenceVersion}`);
const referenceEntry = join(referenceRoot, "node_modules", "uuid", "dist", "index.js");

await ensureReferenceInstalled();

const referenceUuid = await import(pathToFileURL(referenceEntry).href);
const cases = createV7Cases;

console.log(`@ts-zero/uuid v7 benchmark vs uuid@${referenceVersion}`);
console.log(`iterations=${iterations.toLocaleString("en-US")} samples=${samples} warmup=${warmup.toLocaleString("en-US")}`);
console.log("");
console.log(
  `${pad("case", 18)} ${padLeft("ts-zero ops/s", 14)} ${padLeft("uuid ops/s", 14)} ${padLeft("ratio", 8)} ${padLeft("ts-zero ns", 12)} ${padLeft("uuid ns", 12)}`,
);
console.log(`${"-".repeat(18)} ${"-".repeat(14)} ${"-".repeat(14)} ${"-".repeat(8)} ${"-".repeat(12)} ${"-".repeat(12)}`);

for (const [name, localFn] of cases(localUuid)) {
  const referenceFn = new Map(cases(referenceUuid)).get(name);

  if (!referenceFn) {
    throw new Error(`Missing reference benchmark case: ${name}`);
  }

  const local = measure(localFn);
  const reference = measure(referenceFn);
  const ratio = local.opsPerSecond / reference.opsPerSecond;

  console.log(
    `${pad(name, 18)} ${padLeft(formatNumber(local.opsPerSecond), 14)} ${padLeft(formatNumber(reference.opsPerSecond), 14)} ${padLeft(`${ratio.toFixed(2)}x`, 8)} ${padLeft(formatNumber(local.nsPerOp), 12)} ${padLeft(formatNumber(reference.nsPerOp), 12)}`,
  );
}

function createV7Cases(uuid) {
  const deterministicBuffer = new Uint8Array(16);
  const cryptoBuffer = new Uint8Array(16);

  return [
    [
      "deterministic str",
      () => uuid.v7({ msecs: 0x0190163d8694, seq: 0xaabbccdd, random: deterministicRandom }),
    ],
    [
      "deterministic buf",
      () => uuid.v7({ msecs: 0x0190163d8694, seq: 0xaabbccdd, random: deterministicRandom }, deterministicBuffer),
    ],
    ["crypto string", () => uuid.v7()],
    ["crypto buffer", () => uuid.v7(undefined, cryptoBuffer)],
  ];
}

async function ensureReferenceInstalled() {
  if (existsSync(referenceEntry)) {
    return;
  }

  await mkdir(referenceRoot, { recursive: true });
  execFileSync(
    "npm",
    [
      "install",
      "--prefix",
      referenceRoot,
      "--no-save",
      "--no-audit",
      "--no-fund",
      `uuid@${referenceVersion}`,
    ],
    { stdio: "inherit" },
  );
}

function measure(fn) {
  runLoop(fn, warmup);

  const timings = [];

  for (let sample = 0; sample < samples; sample += 1) {
    const start = performance.now();
    runLoop(fn, iterations);
    timings.push(performance.now() - start);
  }

  const bestMs = Math.min(...timings);

  return {
    opsPerSecond: iterations / (bestMs / 1000),
    nsPerOp: (bestMs * 1_000_000) / iterations,
  };
}
