# @ts-zero/querystring

Parser et serializer de query string TypeScript, zero dependance runtime, concu comme une alternative stricte au noyau utile de `qs`.

## Objectif

`URLSearchParams` couvre les paires plates, mais pas les objets imbriques ou les arrays style `tags[]=ts`. Ce package vise ce manque avec une API petite, auditable, securisee et extremement optimisee pour le tree-shaking.

## Installation

```sh
npm install @ts-zero/querystring
```

## API

```ts
import { parseQuery, stringifyQuery } from "@ts-zero/querystring";

parseQuery("user[name]=Ada&tags[]=ts&tags[]=zero");
// { user: { name: "Ada" }, tags: ["ts", "zero"] }

stringifyQuery({ user: { name: "Ada" }, tags: ["ts", "zero"] });
// "user%5Bname%5D=Ada&tags%5B%5D=ts&tags%5B%5D=zero"
```

Imports a la carte:

```ts
import { parseQuery } from "@ts-zero/querystring/parse";
import { stringifyQuery } from "@ts-zero/querystring/stringify";
```

## Contrat v0

Supporte:

- `a=1`
- `a=1&a=2`
- `tags[]=ts&tags[]=zero`
- `user[name]=Ada`
- encodage et decodage percent-encoding UTF-8
- `+` comme espace au parsing par defaut
- delimiters personnalisables

Non-goals v0:

- compatibilite complete avec `qs`
- dot notation
- nested arrays
- arrays d'objets
- coercion automatique des types au parsing
- charset legacy
- parsing permissif des cles mal formees

## Securite

- Les objets parses sont crees avec `Object.create(null)`.
- Les chemins contenant `__proto__`, `constructor` ou `prototype` sont ignores.
- Les limites `depth` et `parameterLimit` sont strictes.
- Les formes ambigues comme `a=1&a[b]=2` sont rejetees.
- Les sequences percent-encoded invalides echouent explicitement.

## Tree-Shaking Top Tier

Le package est ESM-only, `sideEffects: false`, et les points d'entree sont separes:

- `@ts-zero/querystring`
- `@ts-zero/querystring/parse`
- `@ts-zero/querystring/stringify`

`index.ts` ne contient que des re-exports. Les nouvelles APIs doivent rester splittables: importer `parseQuery` ne doit pas retenir le serializer, et importer `stringifyQuery` ne doit pas retenir le parser.

## Verification

```sh
npm test
npm run check
```
