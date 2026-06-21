# @ts-zero/fsm

Finite state machines TypeScript, zero dependance runtime, inspirees par le noyau utile de XState sans reprendre son scope complet.

## Objectif

`@ts-zero/fsm` fournit une brique minuscule pour modeliser des workflows deterministes: etat courant, contexte immutable, evenements, guards, actions et service subscribable.

Le package vise les usages ou une machine explicite est preferable a une cascade de booleens ou de reducers ad hoc.

## API

```ts
import { assign, createMachine, createService, defineXStateConfig } from "@ts-zero/fsm";

const config = defineXStateConfig({
  initial: "idle",
  context: { retries: 0 },
  states: {
    idle: {
      on: {
        SUBMIT: "loading",
      },
    },
    loading: {
      on: {
        RESOLVE: "success",
        REJECT: {
          target: "idle",
          action: assign((context) => ({ retries: context.retries + 1 })),
        },
      },
    },
    success: {},
  },
});

const machine = createMachine(config);
const service = createService(machine);

service.subscribe((snapshot) => {
  console.log(snapshot.value);
});

service.send("SUBMIT");
```

## Compatibilite XState Visualizer

La config source suit le sous-ensemble plat du format XState/Stately: `id`, `description`, `context`, `initial`, `states`, `on`, `target`, `guard`, `cond`, `actions`, `tags`, `meta` et `type: "final"` peuvent etre presents.

Pour visualiser une machine, garde la config dans une constante et colle-la dans le visualizer avec `createMachine(config)`:

```ts
import { createMachine } from "xstate";

const config = {
  id: "approval",
  initial: "draft",
  context: { approved: false },
  states: {
    draft: {
      on: {
        APPROVE: {
          target: "approved",
        },
      },
    },
    approved: {
      type: "final",
    },
  },
};

export default createMachine(config);
```

`toXStateConfig(machine)` retourne la config source d'une machine `@ts-zero/fsm` pour l'exporter ou la coller dans un outil de visualisation.

## Contrat v0

Supporte:

- machines a etats plats;
- evenements string ou `{ type: string }`;
- transitions simples par target;
- transitions configurees avec `target`, `guard`, `action` ou `actions`;
- alias XState `cond` pour les guards;
- metadata compatible visualisation: `id`, `description`, `tags`, `meta`, `type: "final"`;
- tableaux de transitions pour choisir la premiere guard valide;
- context immutable par convention via `assign`;
- snapshots immuables;
- service `start`, `stop`, `send`, `subscribe`.

Non-goals v0:

- statecharts hierarchiques;
- parallel states;
- delayed transitions;
- actors enfants;
- invoke/promise orchestration;
- persistence avancee;
- schema validation;
- decorators;
- generation de code.

## Securite

- Les configs invalides echouent explicitement avec `FsmError`.
- Les evenements doivent avoir un type non vide.
- Les targets inconnues sont rejetees.
- Les services stoppes refusent les evenements.
- Les snapshots publics sont freezes.
- Aucune evaluation dynamique, aucun timer implicite, aucune dependance runtime.

## Tree-Shaking Top Tier

Le package est ESM-only, `sideEffects: false`, et les points d'entree sont separes:

- `@ts-zero/fsm`
- `@ts-zero/fsm/assign`
- `@ts-zero/fsm/machine`
- `@ts-zero/fsm/service`
- `@ts-zero/fsm/errors`
- `@ts-zero/fsm/types`
- `@ts-zero/fsm/xstate`

`index.ts` ne contient que des re-exports. Les primitives `assign`, `createMachine`, `createService` et `toXStateConfig` doivent rester importables separement pour permettre aux bundlers de ne retenir que le code utilise.
