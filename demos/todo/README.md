# Todo Demo

Demo minimale pour `@ts-zero/http` avec une todo app rendue cote serveur, puis amelioree cote navigateur avec `@ts-zero/html`.

## Lancer

```sh
npm run demo:todo
```

Puis ouvrir:

```txt
http://localhost:3000
```

Avec Bun:

```sh
npm run demo:todo:bun
```

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
- client TSX dans `client.tsx`, structure comme une petite couche de composants;
- compilation du client demo avec le JSX runtime `@ts-zero/html/jsx-runtime`;
- import map navigateur pour utiliser des imports `@ts-zero/...` sans bundler;
- adaptateurs runtime separes du coeur HTTP.

Les todos sont stockees en memoire et disparaissent quand le serveur s'arrete.
