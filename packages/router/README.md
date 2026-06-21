# @ts-zero/router

Router explicite TypeScript, zero dependance runtime, inspire par la clarte des routeurs backend comme Phoenix.

## Objectif

Le routeur est une source de verite explicite qui produit un manifest public. Le file-based routing ou d'autres ergonomies pourront compiler vers ce manifest plus tard, mais le coeur reste simple, inspectable et sans magie.

## API

```ts
import { defineRoutes } from "@ts-zero/router";

export const router = defineRoutes((r) => {
  r.pipeline("browser", []);

  r.scope("/", { pipe: "browser" }, (r) => {
    r.get("home", "/", home);
    r.scope("/todos", (r) => {
      r.get("todos.index", "/", todos.index);
      r.post("todos.create", "/", todos.create);
      r.get("todos.show", "/:id", todos.show);
    });
  });
});

router.match("GET", "/todos/123");
router.path("todos.show", { id: "123" });
router.manifest();
```

## Contrat v0

Supporte:

- `defineRoutes`;
- routes nommees;
- scopes imbriques;
- pipelines nommes sur scopes;
- params par segment `:id`;
- matching method/path;
- reverse routing par nom;
- manifest serialisable sans handler.
- snapshots publics immuables pour `routes` et `manifest()`.

Non-goals v0:

- decorators;
- file-based routing;
- generation de code;
- macros;
- React/JSX;
- validation schema des params;
- wildcards/splats;
- contraintes regex dans les routes.

## Securite

- Les params sont retournes dans des objets null-prototype.
- Les chemins mal percent-encoded echouent explicitement.
- Les noms de route dupliques sont rejetes.
- Les collisions `method + path` sont rejetees.
- Les params dupliques dans un meme path sont rejetes.
- Les pipelines inconnus sont rejetes.
- `match()` attend un pathname sans query string ni fragment.

## Tree-Shaking Top Tier

Le package est ESM-only, `sideEffects: false`, et les points d'entree sont separes:

- `@ts-zero/router`
- `@ts-zero/router/builder`
- `@ts-zero/router/path`
- `@ts-zero/router/errors`
- `@ts-zero/router/types`

`index.ts` ne contient que des re-exports. Les helpers de path doivent rester importables sans retenir le builder.
