import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const port = process.env.PORT ?? "3000";
const demoRoot = fileURLToPath(new URL("../..", import.meta.url));
const repositoryRoot = fileURLToPath(new URL("../../../..", import.meta.url));

const packages = spawn("npm", ["run", "build", "--", "--watch", "--preserveWatchOutput"], {
  cwd: repositoryRoot,
  stdio: "inherit",
});

const demo = spawn("npm", ["exec", "tsc", "--", "-b", "--watch", "--preserveWatchOutput"], {
  cwd: demoRoot,
  stdio: "inherit",
});

const client = spawn("npm", ["exec", "vite", "--", "build", "--config", "web/vite.config.ts", "--watch"], {
  cwd: demoRoot,
  stdio: "inherit",
});

const backend = spawn(process.execPath, ["--watch", "dist/web/server/node.js"], {
  cwd: demoRoot,
  env: {
    ...process.env,
    PORT: port,
  },
  stdio: "inherit",
});

let shuttingDown = false;
const processes = [packages, demo, client, backend] as const;

for (const child of processes) {
  child.on("exit", (code) => {
    if (!shuttingDown) {
      shutdown();
      process.exit(code ?? 1);
    }
  });
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    shutdown(signal);
  });
}

function shutdown(signal: NodeJS.Signals = "SIGTERM"): void {
  shuttingDown = true;

  for (const child of processes) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
}
