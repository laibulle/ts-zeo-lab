# @ts-zero/multipart

Encodeur `multipart/form-data` TypeScript, zero dependance runtime.

## Objectif

Ce package couvre le noyau utile de `form-data`: produire un body multipart et son `Content-Type` a partir de champs et fichiers deja disponibles en memoire. Il ne remplace pas toute la surface historique de `form-data`.

## Installation

```sh
npm install @ts-zero/multipart
```

## API

```ts
import { encodeMultipart, field, file } from "@ts-zero/multipart";

const encoded = encodeMultipart([
  field("name", "Ada"),
  file("avatar", "ada.txt", new Uint8Array([104, 105]), "text/plain"),
]);

encoded.contentType;
encoded.bytes;
```

Imports a la carte:

```ts
import { encodeMultipart } from "@ts-zero/multipart/encode";
import { field, file } from "@ts-zero/multipart/parts";
import { createBoundary } from "@ts-zero/multipart/boundary";
```

## Contrat v0

Supporte:

- champs texte;
- fichiers en `Uint8Array`, `ArrayBuffer` ou tableau de bytes;
- `Content-Type` de fichier explicite;
- `application/octet-stream` par defaut;
- boundary generee avec `globalThis.crypto.getRandomValues`;
- boundary injectable pour tests deterministes.

Non-goals v0:

- Node streams;
- acces filesystem;
- MIME sniffing ou detection par extension;
- polyfill `FormData`;
- compatibilite complete avec `form-data`;
- encodage de gros fichiers sans buffering.

## Securite

- Pas de fallback faible si `crypto.getRandomValues` est indisponible.
- Validation stricte de la boundary.
- Rejet des injections CRLF dans `name`, `filename` et `contentType`.
- Rejet des caracteres de controle, guillemets et backslashes dans les parametres de header.
- Rejet des bodies qui contiennent le marqueur `--boundary`.
- Pas de sniffing MIME implicite.
- Pas de lecture filesystem implicite.

## Tree-Shaking Top Tier

Le package est ESM-only, `sideEffects: false`, et les points d'entree sont separes:

- `@ts-zero/multipart`
- `@ts-zero/multipart/encode`
- `@ts-zero/multipart/parts`
- `@ts-zero/multipart/boundary`

`index.ts` ne contient que des re-exports. Importer `@ts-zero/multipart/parts` ne doit pas retenir l'encodeur ni la generation aleatoire de boundary.

## Verification

```sh
npm test
npm run check
```
