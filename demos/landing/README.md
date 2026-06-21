# Demo Lab

Landing de demonstration pour `ts-zero`, avec des demos integrees dont une todo app rendue cote serveur, puis amelioree cote navigateur avec Solid.

La demo est organisee comme une petite application d'architecture propre: le domaine Todo reste independant, les cas d'usage pilotent les ports, SQLite vit dans l'infrastructure, et HTTP ne fait que composer ces pieces.

## Lancer

```sh
npm run demo:landing
```

Puis ouvrir:

```txt
http://localhost:3000
```

Le serveur HTTP applicatif ecoute sur `3000` par defaut. La racine `/` sert une landing SSR qui liste les demos. La todo vit sur `/todos`, avec ses statistiques sur `/stats`. En developpement, le client Solid est bundle par Vite en mode watch dans `dist/web/public`, puis servi par le serveur applicatif comme en production.

Avec Bun:

```sh
npm run demo:landing:bun
```

App native macOS:

```sh
npm run demo:landing:macos
```

Pour ouvrir le projet Xcode genere:

```sh
npm --workspace @ts-zero/demo-landing run native:open:xcode
```

Le projet Xcode est genere depuis `native/project.yml` avec XcodeGen. Le `.xcodeproj` reste un artefact local.

## Ce que la demo exerce

- `@ts-zero/http` pour le routing Web Standard `Request` / `Response`;
- Solid pour remonter l'UI HTML cote navigateur avec un rendu fin et familier des devs React;
- `@ts-zero/node-server` pour servir la demo avec Node;
- `@ts-zero/bun-server` pour servir la meme app avec Bun;
- `@ts-zero/store` pour l'etat immutable partage entre le serveur et le client;
- `@ts-zero/mutation` pour les mutations versionnees, les acknowledgements compacts et le fallback snapshot;
- `@ts-zero/uuid/v7` pour les ids de todos;
- formulaires HTML classiques;
- landing SSR avec demos integrees;
- plusieurs pages: landing, liste des todos et statistiques;
- routes POST sans JavaScript client, gardees comme fallback;
- mutations JSON inspectables sur `POST /todos/actions`: `version + action`, sans RPC cache;
- client TSX dans `web/client/client.tsx`, structure en pages et composants;
- compilation du client demo avec Solid et Vite;
- Vite pour bundler le client TypeScript/TSX de demo;
- SQLite pour persister les todos;
- app macOS SwiftUI native qui charge un runtime TypeScript dans JavaScriptCore;
- `@ts-zero/runtime` pour le channel host, les events, les messages et les capabilities partages;
- adaptateurs runtime separes du coeur HTTP.

## Architecture

- `domain/`: modele Todo et regles metier pures, sans HTTP, SQLite, DOM ou store;
- `application/`: cas d'usage Todo et projection en memoire pour le rendu SSR;
- `infrastructure/`: repository SQLite, compatible Node `node:sqlite` et Bun `bun:sqlite`;
- `web/`: couche interface facon Phoenix, avec front, serveur web et contrats partages;
- `web/server/`: HTTP, SSR et adaptateurs Node/Bun;
- `web/client/`: entree navigateur, landing, pages et composants interactifs;
- `web/client/mutations.ts`: client HTTP mince pour `@ts-zero/mutation`;
- `web/shared/`: contrats partages front/serveur, comme routes et snapshots;
- `web/server/app.ts`: composition root HTTP, routing et SSR;
- `web/vite.config.ts`: build client Vite en bundle et chunks.
- `native/runtime/`: runtime TypeScript partageable execute dans JavaScriptCore via `@ts-zero/runtime`;
- `native/macos/`: host SwiftUI macOS et implementation des capabilities natives;
- `native/project.yml`: manifest XcodeGen pour generer le projet Xcode.

Les todos sont persistees dans `todo.sqlite` par defaut. Le chemin peut etre remplace avec:

```sh
TODO_DB=/tmp/todo.sqlite npm run demo:landing
```
