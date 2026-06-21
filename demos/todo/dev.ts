import { spawn } from "node:child_process";

const backendPort = process.env.BACKEND_PORT ?? "3001";
const frontendPort = process.env.PORT ?? process.env.FRONTEND_PORT ?? "3000";

const backend = spawn(process.execPath, ["dist/server.js"], {
  env: {
    ...process.env,
    PORT: backendPort,
    TODO_CLIENT_ENTRY: "/pages/client.tsx",
  },
  stdio: "inherit",
});

const vite = spawn("npm", ["exec", "vite", "--", "--host", "127.0.0.1", "--port", frontendPort], {
  env: {
    ...process.env,
    BACKEND_PORT: backendPort,
    FRONTEND_PORT: frontendPort,
  },
  stdio: "inherit",
});

let shuttingDown = false;

backend.on("exit", (code) => {
  if (!shuttingDown) {
    shuttingDown = true;
    vite.kill();
    process.exit(code ?? 1);
  }
});

vite.on("exit", (code) => {
  if (!shuttingDown) {
    shuttingDown = true;
    backend.kill();
    process.exit(code ?? 1);
  }
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    shuttingDown = true;
    backend.kill(signal);
    vite.kill(signal);
  });
}
