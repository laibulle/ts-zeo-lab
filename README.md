# ts-zero

Monorepo TypeScript pour des librairies sous le namespace `@ts-zero`.

Objectif: produire des packages TypeScript petits, lisibles, rapides, securises, et sans aucune dependance runtime.

## Principes

- Zero dependance runtime dans chaque package publie.
- Tree-shaking extremement optimise: exports ESM purs, pas d'effets de bord inutiles, imports a la carte.
- Tree-checking strict: chaque nouvelle API doit etre concue pour etre eliminable si elle n'est pas importee.
- Conformite explicite aux standards cibles.
- Securite haute: pas de fallback faible, erreurs explicites sur les cas dangereux.
- Performance mesuree par benchmark, avec comparaison reference hors dependances du repo.
- Documentation obligatoire par package: `README.md` et `AGENTS.md`.

## Packages

- `@ts-zero/uuid`: generation et manipulation d'UUID, avec un contrat proche du package `uuid`.
- `@ts-zero/querystring`: parse/stringify de query strings imbriquees, avec un noyau strict inspire de `qs`.
- `@ts-zero/multipart`: encodage `multipart/form-data` en memoire, avec un noyau strict inspire de `form-data`.

## Commandes

```sh
npm install
npm run build
npm test
npm run check
npm run bench:uuid:compare
```

Les benchmarks de comparaison installent les references dans un dossier temporaire hors du depot; elles ne sont pas ajoutees aux dependances.

## Release Gate

Avant publication d'un package:

```sh
npm run check
```

Ce gate construit les packages, lance les tests, verifie les subpaths publics, les invariants de securite, le tree-checking de base, et effectue un `npm pack --dry-run`.

## Tree-Shaking Top Tier

Les packages `@ts-zero` doivent viser une elimination de code de premier niveau:

- exports nommes et stables, pas d'export global qui force a retenir toute la librairie;
- ESM uniquement pour les packages publies;
- `sideEffects: false` par defaut;
- aucun effet de bord top-level sauf constantes immuables et tables de lookup necessaires;
- pas d'initialisation couteuse au chargement du module;
- pas de registre global, auto-install, monkey patch, polyfill implicite ou detection qui modifie l'environnement;
- APIs separees par responsabilite pour permettre aux bundlers de retirer ce qui n'est pas importe;
- verifier les changements en pensant bundle: une feature non importee ne doit pas augmenter le code utile du consommateur.
