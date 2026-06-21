# @ts-zero/node-server

Adaptateur Node HTTP pour handlers Web Standard `Request` / `Response`, zero dependance runtime.

## Objectif

`@ts-zero/http` reste le coeur portable. Ce package isole les APIs Node dans un adaptateur dedie.

## API

```ts
import { serve } from "@ts-zero/node-server";
import { app } from "./app";

serve({
  fetch: app.fetch,
  port: 3000,
});
```

## Contrat v0

Supporte:

- `node:http`;
- conversion `IncomingMessage` vers `Request`;
- ecriture streaming de `Response.body`;
- limite de body configurable;
- hooks `onListen` et `onError`;
- fermeture via `handle.close()`.

Non-goals v0:

- HTTPS;
- HTTP/2;
- compression;
- static files;
- cookies/sessions;
- cluster;
- proxy trust;
- TLS certificates.

## Securite

- Limite de body par defaut: 1 MiB.
- Erreurs internes non exposees par defaut.
- Pas de dependance runtime.
- Pas de magie globale.

## Tree-Shaking Top Tier

Le package est ESM-only, `sideEffects: false`, avec subpaths:

- `@ts-zero/node-server`
- `@ts-zero/node-server/serve`
- `@ts-zero/node-server/types`

Ce package peut importer `node:http`; aucun package portable ne doit dependre de lui.
