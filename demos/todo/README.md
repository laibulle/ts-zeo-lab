# Todo Demo

Demo minimale pour `@ts-zero/http` avec une todo app rendue cote serveur.

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
- `@ts-zero/node-server` pour servir la demo avec Node;
- `@ts-zero/bun-server` pour servir la meme app avec Bun;
- `@ts-zero/uuid/v7` pour les ids de todos;
- formulaires HTML classiques;
- routes POST sans JavaScript client;
- adaptateurs runtime separes du coeur HTTP.

Les todos sont stockees en memoire et disparaissent quand le serveur s'arrete.
