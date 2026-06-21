# Todo Demo

Demo minimale pour `@ts-zero/http` avec une todo app rendue cote serveur, puis amelioree cote navigateur avec `@ts-zero/html`.

La demo est organisee comme une petite application d'architecture propre: le domaine Todo reste independant, les cas d'usage pilotent les ports, SQLite vit dans l'infrastructure, et HTTP ne fait que composer ces pieces.

## Lancer

```sh
npm run demo:todo
```

Puis ouvrir:

```txt
http://localhost:3000
```

Le serveur HTTP applicatif tourne derriere Vite. Par defaut, Vite ecoute sur `3000` et le backend sur `3001`.

Avec Bun:

```sh
npm run demo:todo:bun
```

App native macOS:

```sh
npm run demo:todo:macos
```

Pour ouvrir le projet Xcode genere:

```sh
npm --workspace @ts-zero/demo-todo run native:open:xcode
```

Le projet Xcode est genere depuis `native/project.yml` avec XcodeGen. Le `.xcodeproj` reste un artefact local.

## Ce que la demo exerce

- `@ts-zero/http` pour le routing Web Standard `Request` / `Response`;
- `@ts-zero/html` pour remonter l'UI HTML cote navigateur sans VDOM generaliste;
- `@ts-zero/node-server` pour servir la demo avec Node;
- `@ts-zero/bun-server` pour servir la meme app avec Bun;
- `@ts-zero/store` pour l'etat immutable partage entre le serveur et le client;
- `@ts-zero/uuid/v7` pour les ids de todos;
- formulaires HTML classiques;
- plusieurs pages: liste des todos et statistiques;
- routes POST sans JavaScript client, gardees comme fallback;
- client TSX dans `web/client/client.tsx`, structure en pages et composants;
- compilation du client demo avec le JSX runtime `@ts-zero/html/jsx-runtime`;
- Vite pour servir le client TypeScript/TSX de demo;
- SQLite pour persister les todos;
- app macOS SwiftUI native qui charge un runtime TypeScript dans JavaScriptCore;
- `@ts-zero/native-runtime` pour le channel host natif, les messages et les capabilities;
- adaptateurs runtime separes du coeur HTTP.

## Architecture

- `domain/`: modele Todo et regles metier pures, sans HTTP, SQLite, DOM ou store;
- `application/`: cas d'usage Todo et projection en memoire pour le rendu SSR;
- `infrastructure/`: repository SQLite, compatible Node `node:sqlite` et Bun `bun:sqlite`;
- `web/`: couche interface facon Phoenix, avec front, serveur web et contrats partages;
- `web/server/`: HTTP, SSR et adaptateurs Node/Bun;
- `web/client/`: entree navigateur, pages et composants interactifs;
- `web/shared/`: contrats partages front/serveur, comme routes et snapshots;
- `web/server/app.ts`: composition root HTTP, routing et SSR;
- `web/vite.config.ts`: serveur de developpement client et proxy vers le backend.
- `native/runtime/`: runtime TypeScript execute dans JavaScriptCore;
- `native/macos/`: host SwiftUI macOS et implementation des capabilities natives;
- `native/project.yml`: manifest XcodeGen pour generer le projet Xcode.

Les todos sont persistees dans `todo.sqlite` par defaut. Le chemin peut etre remplace avec:

```sh
TODO_DB=/tmp/todo.sqlite npm run demo:todo
```
