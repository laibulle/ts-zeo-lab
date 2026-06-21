# @ts-zero/bun-server

Adaptateur Bun pour handlers Web Standard `Request` / `Response`, zero dependance runtime.

## Objectif

`@ts-zero/http` reste le coeur portable. Ce package isole `Bun.serve` dans un adaptateur dedie, sans import Node.

## API

```ts
import { serve } from "@ts-zero/bun-server";
import { app } from "./app";

serve({
  fetch: app.fetch,
  port: 3000,
});
```

## Contrat v0

Supporte:

- delegation vers `Bun.serve`;
- options `port`, `hostname`, `development`;
- hooks `onListen` et `onError`;
- arret via `handle.stop()`.

Non-goals v0:

- serveur Node;
- polyfill Bun;
- static files;
- sessions;
- cache;
- WebSocket.

## Securite

- Echoue explicitement si `Bun.serve` est indisponible.
- Pas de fallback Node.
- Pas de dependance runtime.
- Pas de magie globale.

## Tree-Shaking Top Tier

Le package est ESM-only, `sideEffects: false`, avec subpaths:

- `@ts-zero/bun-server`
- `@ts-zero/bun-server/serve`
- `@ts-zero/bun-server/types`

Ce package ne doit jamais importer `node:*`.
