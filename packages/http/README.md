# @ts-zero/http

Fondation HTTP TypeScript basee sur les standards Web `Request` et `Response`, zero dependance runtime.

## Objectif

Ce package est la premiere brique d'une plateforme web portable: serverless, edge, Node moderne, Bun, Deno, Workers et adaptateurs futurs doivent pouvoir converger vers le meme contrat:

```ts
Request -> Promise<Response>
```

## Installation

```sh
npm install @ts-zero/http
```

## API

```ts
import { createApp, json, text } from "@ts-zero/http";

const app = createApp();

app.get("/", () => text("Hello"));
app.get("/users/:id", ({ params }) => json({ id: params.id }));

export default app.fetch;
```

Pour les plateformes qui exposent des handlers par methode:

```ts
export const GET = app.fetch;
export const POST = app.fetch;
```

Imports a la carte:

```ts
import { createApp } from "@ts-zero/http/app";
import { json, redirect } from "@ts-zero/http/responses";
import { httpError } from "@ts-zero/http/errors";
```

## Contrat v0

Supporte:

- handlers Web Standard `Request` / `Response`;
- routes statiques et params par segment, ex: `/users/:id`;
- middleware sequentiel;
- state applicatif statique ou async par requete;
- handlers `notFound` et `onError`;
- helpers `text`, `html`, `json`, `redirect`, `noContent`;
- comportement `HEAD` sans body.

Non-goals v0:

- serveur Node;
- adaptateur Vercel dedie;
- filesystem routing;
- JSX;
- SSR;
- WebSocket;
- sessions/auth/cache;
- parsing body automatique.

## Securite

- Les chemins mal percent-encoded retournent une erreur HTTP explicite.
- Les erreurs non HTTP ne fuitent pas leur message par defaut.
- Les params de route sont stockes dans un objet null-prototype.
- Aucun acces filesystem, aucun eval, aucun monkey patch.

## Tree-Shaking Top Tier

Le package est ESM-only, `sideEffects: false`, et les points d'entree sont separes:

- `@ts-zero/http`
- `@ts-zero/http/app`
- `@ts-zero/http/responses`
- `@ts-zero/http/errors`
- `@ts-zero/http/types`

`index.ts` ne contient que des re-exports. Importer les helpers de reponse ne doit pas retenir le router ou le runtime app.

## Verification

```sh
npm test
npm run check
```
