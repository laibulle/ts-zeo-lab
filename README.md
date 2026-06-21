# ts-zero

Monorepo TypeScript pour des librairies sous les namespaces `@ts-zero` et `@ts-zero-kit`.

Objectif: produire des packages TypeScript petits, lisibles, rapides, securises, et sans dependance runtime externe.

## Principes

- `packages/*` contient les primitives `@ts-zero/*`.
- `kits/*` contient les kits composes `@ts-zero-kit/*`.
- Les primitives ont zero dependance runtime, y compris interne sauf decision explicite.
- Les kits ont zero dependance runtime externe, mais peuvent composer des primitives `@ts-zero/*`.
- Tree-shaking extremement optimise: exports ESM purs, pas d'effets de bord inutiles, imports a la carte.
- Tree-checking strict: chaque nouvelle API doit etre concue pour etre eliminable si elle n'est pas importee.
- Conformite explicite aux standards cibles.
- Securite haute: pas de fallback faible, erreurs explicites sur les cas dangereux.
- Performance mesuree par benchmark, avec comparaison reference hors dependances du repo.
- Documentation obligatoire par package: `README.md` et `AGENTS.md`.

## Primitives

- `@ts-zero/uuid`: generation et manipulation d'UUID, avec un contrat proche du package `uuid`.
- `@ts-zero/querystring`: parse/stringify de query strings imbriquees, avec un noyau strict inspire de `qs`.
- `@ts-zero/multipart`: encodage `multipart/form-data` en memoire, avec un noyau strict inspire de `form-data`.
- `@ts-zero/http`: fondation HTTP Web Standard `Request` / `Response` pour runtimes serverless et edge.
- `@ts-zero/node-server`: adaptateur Node HTTP pour handlers Web Standard.
- `@ts-zero/bun-server`: adaptateur Bun.serve pour handlers Web Standard.
- `@ts-zero/router`: routeur explicite `defineRoutes`, manifest public, scopes et pipelines.
- `@ts-zero/store`: noyau d'etat immutable pour runtimes serveur/client, hydration et rendu fin.
- `@ts-zero/html`: runtime UI HTML browser, store-first, sans VDOM generaliste ni compilateur obligatoire.

## Kits

Les kits vivent dans `kits/*` et sont publies sous `@ts-zero-kit/*`.

- `@ts-zero-kit/sync`: cible pour la synchronisation offline-first, queues durables, idempotence et reconciliation.
- `@ts-zero-kit/web`: cible pour assembler les primitives web/server en experience applicative.
- `@ts-zero-kit/live`: cible pour composer runtime, mutations et canaux live.

Aucun kit n'ajoute de dependance runtime externe. Les dependances internes `@ts-zero/*` doivent etre documentees et importees via des subpaths tree-shakables quand ils existent.

## Commandes

```sh
npm install
npm run build
npm run build:primitives
npm test
npm run check
npm run bench:uuid:compare
npm run demo:landing
npm run demo:landing:bun
npm run docker:landing:build
npm run docker:landing:run
```

Les benchmarks de comparaison installent les references dans un dossier temporaire hors du depot; elles ne sont pas ajoutees aux dependances.

## Release Gate

Avant publication d'un package:

```sh
npm run check
```

Ce gate construit les primitives, lance les tests, verifie les subpaths publics, les invariants de securite, le tree-checking de base, et effectue un `npm pack --dry-run`.

## Demos

- `demos/landing`: landing SSR avec demos integrees, dont un counter distribue HTTP/SSE, une todo app avec `@ts-zero/http`, `@ts-zero/node-server`, `@ts-zero/bun-server`, `@ts-zero/router`, `@ts-zero/store` et `@ts-zero/uuid/v7`.

La landing est deployable:

- sur Vercel via `vercel.json`, avec `api/index.ts` comme Web Function, `TODO_REPOSITORY=memory` et counter en replay serverless;
- en conteneur Bun multi-stage avec `demos/landing/Dockerfile`, SQLite persistant et counter live SSE.

## Tree-Shaking Top Tier

Les packages `@ts-zero` et `@ts-zero-kit` doivent viser une elimination de code de premier niveau:

- exports nommes et stables, pas d'export global qui force a retenir toute la librairie;
- ESM uniquement pour les packages publies;
- `sideEffects: false` par defaut;
- aucun effet de bord top-level sauf constantes immuables et tables de lookup necessaires;
- pas d'initialisation couteuse au chargement du module;
- pas de registre global, auto-install, monkey patch, polyfill implicite ou detection qui modifie l'environnement;
- APIs separees par responsabilite pour permettre aux bundlers de retirer ce qui n'est pas importe;
- verifier les changements en pensant bundle: une feature non importee ne doit pas augmenter le code utile du consommateur.
