# @ts-zero/native-runtime

Runtime natif portable, zero dependance runtime, pour faire tourner du TypeScript dans un host mobile comme JavaScriptCore iOS, Android, Node, Bun ou un environnement de test.

## Objectif

`@ts-zero/native-runtime` definit la frontiere entre le code applicatif JavaScript et le host natif. Le vocabulaire est volontairement `channel`, pas `bridge`: un channel transporte des messages de controle, tandis que les donnees lourdes restent cote natif via des handles opaques.

## API

```ts
import { createNativeHandle, createNativeRuntime } from "@ts-zero/native-runtime";

const runtime = createNativeRuntime({
  channel: hostChannel,
});

await runtime.request("secureStorage", "set", {
  key: "session",
  value: "token",
});

runtime.emit("analytics.track", {
  name: "app.opened",
});

const frame = createNativeHandle("camera.frame", "frame-123", {
  width: 1920,
  height: 1080,
});
```

## Contrat v0

Supporte:

- `HostChannel` avec `send` et `subscribe`;
- requetes capability/operation avec reponse async;
- events runtime -> host et host -> runtime;
- validation fail-closed des messages serialisables;
- handles natifs opaques pour fichiers, images, frames, audio, buffers ou ressources lourdes;
- channel memoire pour les tests et prototypes.

Non-goals v0:

- UI native;
- rendu HTML ou native view tree;
- codegen Swift/Kotlin/C++;
- shared memory;
- streaming haute frequence;
- permissions predefinies;
- retries/timeouts implicites;
- dependance a React Native, Expo, Swift ou Kotlin.

## Native Integrations

Le runtime doit transporter des commandes petites et auditables:

```ts
runtime.request("camera", "capturePhoto", { quality: 0.9 });
```

Pour les donnees lourdes, le host retourne un handle:

```ts
{ nativeHandle: true, kind: "photo", id: "photo-1" }
```

Le JavaScript orchestre, le host natif garde les buffers, fichiers, frames ou objets platform-specific. Cette regle evite de recreer les problemes classiques d'un bridge JSON generaliste.

## Securite

- Les payloads doivent etre serialisables, acycliques et plain-object.
- Les nombres doivent etre finis.
- Les fonctions, symboles, bigint, classes et objets prototypes custom sont rejetes.
- Les cles dangereuses `__proto__`, `constructor` et `prototype` sont rejetees.
- Les responses inconnues echouent explicitement.
- `destroy()` rejette toutes les requetes en attente.

## Tree-Shaking Top Tier

Le package est ESM-only, `sideEffects: false`, et les points d'entree sont separes:

- `@ts-zero/native-runtime`
- `@ts-zero/native-runtime/channel`
- `@ts-zero/native-runtime/errors`
- `@ts-zero/native-runtime/handles`
- `@ts-zero/native-runtime/runtime`
- `@ts-zero/native-runtime/serializable`
- `@ts-zero/native-runtime/types`

`index.ts` ne contient que des re-exports. Les helpers de handles, runtime, channel et validation doivent rester importables separement.
