import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";

import * as localUuid from "../dist/index.js";
import {
  createCases,
  createCryptoCases,
  createOperationCases,
  formatNumber,
  iterations,
  pad,
  padLeft,
  runLoop,
  samples,
  warmup,
} from "./_shared.mjs";

const referenceVersion = process.env.UUID_REFERENCE_VERSION ?? "14.0.1";
const referenceRoot =
  process.env.UUID_REFERENCE_ROOT ?? join(tmpdir(), `ts-zero-uuid-reference-${referenceVersion}`);
const referenceEntry = join(referenceRoot, "node_modules", "uuid", "dist", "index.js");

await ensureReferenceInstalled();

const referenceUuid = await import(pathToFileURL(referenceEntry).href);
console.log(`@ts-zero/uuid vs uuid@${referenceVersion}`);
console.log(`reference=${referenceRoot}`);
console.log(`iterations=${iterations.toLocaleString("en-US")} samples=${samples} warmup=${warmup.toLocaleString("en-US")}`);

runSuite("deterministic generation", createCases(localUuid), createCases(referenceUuid));
runSuite("crypto generation", createCryptoCases(localUuid), createCryptoCases(referenceUuid));
runSuite("operations", createOperationCases(localUuid), createOperationCases(referenceUuid));

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

function runSuite(title, localCaseEntries, referenceCaseEntries) {
  const localCases = new Map(localCaseEntries);
  const referenceCases = new Map(referenceCaseEntries);

  console.log("");
  console.log(title);
  console.log(
    `${pad("case", 14)} ${padLeft("ts-zero ops/s", 14)} ${padLeft("uuid ops/s", 14)} ${padLeft("ratio", 8)} ${padLeft("ts-zero ns", 12)} ${padLeft("uuid ns", 12)}`,
  );
  console.log(`${"-".repeat(14)} ${"-".repeat(14)} ${"-".repeat(14)} ${"-".repeat(8)} ${"-".repeat(12)} ${"-".repeat(12)}`);

  for (const [name, localFn] of localCases) {
    const referenceFn = referenceCases.get(name);

    if (!referenceFn) {
      throw new Error(`Missing reference benchmark case: ${name}`);
    }

    const local = measure(localFn);
    const reference = measure(referenceFn);
    const ratio = local.opsPerSecond / reference.opsPerSecond;

    console.log(
      `${pad(name, 14)} ${padLeft(formatNumber(local.opsPerSecond), 14)} ${padLeft(formatNumber(reference.opsPerSecond), 14)} ${padLeft(`${ratio.toFixed(2)}x`, 8)} ${padLeft(formatNumber(local.nsPerOp), 12)} ${padLeft(formatNumber(reference.nsPerOp), 12)}`,
    );
  }
}
