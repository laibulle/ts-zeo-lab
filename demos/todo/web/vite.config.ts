import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const backendPort = process.env.BACKEND_PORT ?? "3001";
const frontendPort = Number.parseInt(process.env.FRONTEND_PORT ?? process.env.PORT ?? "3000", 10);
const backend = `http://127.0.0.1:${backendPort}`;
const root = fileURLToPath(new URL(".", import.meta.url));
const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url));
const outputDirectory = fileURLToPath(new URL("../dist/web/public", import.meta.url));

export default defineConfig({
  root,
  publicDir: false,
  build: {
    emptyOutDir: true,
    manifest: true,
    modulePreload: false,
    outDir: outputDirectory,
    target: "es2022",
    rollupOptions: {
      input: fileURLToPath(new URL("client/client.tsx", import.meta.url)),
      output: {
        entryFileNames: "client.mjs",
        chunkFileNames: "assets/[name]-[hash].mjs",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
  resolve: {
    alias: [
      {
        find: /^@ts-zero\/html\/(.+)$/,
        replacement: `${repositoryRoot}/packages/html/src/$1.ts`,
      },
      {
        find: /^@ts-zero\/runtime\/(.+)$/,
        replacement: `${repositoryRoot}/packages/runtime/src/$1.ts`,
      },
      {
        find: /^@ts-zero\/store\/(.+)$/,
        replacement: `${repositoryRoot}/packages/store/src/$1.ts`,
      },
    ],
  },
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
      "^/runtime$": backend,
      "^/todos(?:/.*)?$": backend,
    },
  },
});
