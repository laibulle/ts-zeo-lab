import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const backendPort = process.env.BACKEND_PORT ?? "3001";
const frontendPort = process.env.PORT ?? process.env.FRONTEND_PORT ?? "3000";
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

const backend = spawn(process.execPath, ["--watch", "dist/web/server/node.js"], {
  cwd: demoRoot,
  env: {
    ...process.env,
    PORT: backendPort,
    TODO_CLIENT_ENTRY: "/client/client.tsx",
  },
  stdio: "inherit",
});

const vite = spawn("npm", ["exec", "vite", "--", "--config", "web/vite.config.ts", "--host", "127.0.0.1", "--port", frontendPort], {
  cwd: demoRoot,
  env: {
    ...process.env,
    BACKEND_PORT: backendPort,
    FRONTEND_PORT: frontendPort,
  },
  stdio: "inherit",
});

let shuttingDown = false;
const processes = [packages, demo, backend, vite] as const;

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
