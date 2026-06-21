# @ts-zero/runtime

Runtime applicatif cross-surface, zero dependance runtime.

## Objectif

`@ts-zero/runtime` definit le protocole commun entre un runtime applicatif TypeScript et une surface d'execution: navigateur, serveur, JavaScriptCore mobile, SwiftUI, Kotlin, tests, ou autre host.

Le runtime ne rend pas d'UI. Il transporte des events, des requetes de capabilities et des responses.

## API

```ts
import { createRuntime } from "@ts-zero/runtime";

const runtime = createRuntime({
  channel: hostChannel,
});

runtime.emit("todo.create", {
  title: "Ship",
});

const result = await runtime.request("storage", "set", {
  key: "session",
  value: "token",
});
```

## Contrat v0

Supporte:

- `HostChannel` avec `send` et `subscribe`;
- events runtime -> host et host -> runtime;
- requetes `capability + operation` avec response async;
- payloads serialisables;
- handles de ressources opaques pour les donnees lourdes;
- channel memoire pour tests, demos et adapters.

Non-goals v0:

- UI;
- DOM;
- JavaScriptCore ou Swift/Kotlin;
- serveur HTTP;
- shared memory;
- streaming haute frequence;
- retries/timeouts implicites;
- registry de capabilities.

## Surfaces

Le meme runtime peut etre branche sur plusieurs hosts:

- Web: DOM, History, Fetch, localStorage;
- Native: JavaScriptCore, SwiftUI, Kotlin, Keychain, haptics, camera;
- Server: HTTP, SQLite, sessions, logs;
- Tests: `createMemoryHostChannel`.

## Securite

- Les payloads doivent etre serialisables, acycliques et plain-object.
- Les nombres doivent etre finis.
- Les fonctions, symboles, bigint, classes et objets prototypes custom sont rejetes.
- Les cles dangereuses `__proto__`, `constructor` et `prototype` sont rejetees.
- Les responses inconnues echouent explicitement.
- `destroy()` rejette toutes les requetes en attente.

## Tree-Shaking Top Tier

Le package est ESM-only, `sideEffects: false`, et les points d'entree sont separes:

- `@ts-zero/runtime`
- `@ts-zero/runtime/channel`
- `@ts-zero/runtime/errors`
- `@ts-zero/runtime/handles`
- `@ts-zero/runtime/runtime`
- `@ts-zero/runtime/serializable`
- `@ts-zero/runtime/types`

`index.ts` ne contient que des re-exports. Les helpers de channel, handles, runtime et validation doivent rester importables separement.
