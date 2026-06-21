import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const backendPort = process.env.BACKEND_PORT ?? "3001";
const frontendPort = Number.parseInt(process.env.FRONTEND_PORT ?? process.env.PORT ?? "3000", 10);
const backend = `http://127.0.0.1:${backendPort}`;
const root = fileURLToPath(new URL(".", import.meta.url));
const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url));

export default defineConfig({
  root,
  server: {
    host: "127.0.0.1",
    port: frontendPort,
    strictPort: true,
    fs: {
      allow: [
        repositoryRoot,
      ],
    },
    proxy: {
      "^/$": backend,
      "^/stats$": backend,
      "^/todos(?:/.*)?$": backend,
    },
  },
});
