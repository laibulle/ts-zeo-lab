import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { assign, createMachine, createService, defineXStateConfig, FsmError, toXStateConfig } from "../dist/index.js";
import { assign as assignFromSubpath } from "../dist/assign.js";
import { createMachine as createMachineFromSubpath } from "../dist/machine.js";
import { createService as createServiceFromSubpath } from "../dist/service.js";
import { toXStateConfig as toXStateConfigFromSubpath } from "../dist/xstate.js";

function createToggleMachine() {
  return createMachine({
    id: "toggle",
    initial: "inactive",
    context: {
      count: 0,
      locked: false,
    },
    states: {
      inactive: {
        on: {
          TOGGLE: {
            target: "active",
            guard: (context) => !context.locked,
            action: assign((context) => ({ count: context.count + 1 })),
          },
          LOCK: {
            action: assign({ locked: true }),
          },
        },
      },
      active: {
        on: {
          TOGGLE: "inactive",
        },
      },
    },
  });
}

test("creates deterministic machine snapshots and transitions", () => {
  const machine = createToggleMachine();

  assert.deepEqual(machine.initialState, {
    value: "inactive",
    context: {
      count: 0,
      locked: false,
    },
    status: "active",
  });
  assert.equal(Object.isFrozen(machine.initialState), true);

  const result = machine.transition(machine.initialState, "TOGGLE");

  assert.equal(result.changed, true);
  assert.equal(result.event.type, "TOGGLE");
  assert.deepEqual(result.snapshot, {
    value: "active",
    context: {
      count: 1,
      locked: false,
    },
    status: "active",
  });
});

test("guards select the first matching transition and fail closed otherwise", () => {
  const machine = createMachine({
    initial: "idle",
    context: { role: "user" },
    states: {
      idle: {
        on: {
          SUBMIT: [
            { target: "admin", guard: (context) => context.role === "admin" },
            { target: "user", guard: (context) => context.role === "user" },
          ],
          RESTRICTED: [
            { target: "admin", guard: (context) => context.role === "admin" },
          ],
        },
      },
      admin: {},
      user: {},
    },
  });

  assert.equal(machine.transition(machine.initialState, "SUBMIT").snapshot.value, "user");
  assert.deepEqual(machine.transition(machine.initialState, "RESTRICTED"), {
    snapshot: machine.initialState,
    event: { type: "RESTRICTED" },
    changed: false,
  });
});

test("accepts XState-compatible cond aliases and exposes the source config", () => {
  const config = defineXStateConfig({
    id: "approval",
    description: "Pasteable in the XState visualizer for the supported flat-machine subset.",
    initial: "draft",
    context: { approved: false },
    states: {
      draft: {
        tags: ["editable"],
        on: {
          APPROVE: {
            target: "approved",
            cond: () => true,
            actions: [assign({ approved: true })],
          },
        },
      },
      approved: {
        type: "final",
      },
    },
  });
  const machine = createMachine(config);
  const result = machine.transition(machine.initialState, "APPROVE");

  assert.equal(result.snapshot.value, "approved");
  assert.deepEqual(result.snapshot.context, { approved: true });
  assert.equal(machine.config, config);
  assert.equal(toXStateConfig(machine), config);
  assert.equal(toXStateConfig(config), config);
});

test("internal transitions can update immutable context without changing state", () => {
  const machine = createMachine({
    initial: "idle",
    context: { count: 1 },
    states: {
      idle: {
        on: {
          INC: {
            action: assign((context, event) => ({ count: context.count + event.by })),
          },
        },
      },
    },
  });

  const result = machine.transition(machine.initialState, { type: "INC", by: 2 });

  assert.equal(result.changed, true);
  assert.equal(result.snapshot.value, "idle");
  assert.deepEqual(result.snapshot.context, { count: 3 });
  assert.notEqual(result.snapshot.context, machine.initialState.context);
});

test("service sends events, notifies subscribers, and stops explicitly", () => {
  const service = createService(createToggleMachine());
  const events = [];

  const unsubscribe = service.subscribe((snapshot, previousSnapshot, event) => {
    events.push({
      event: event.type,
      from: previousSnapshot.value,
      to: snapshot.value,
    });
  });

  service.send("TOGGLE");
  unsubscribe();
  service.send("TOGGLE");

  assert.deepEqual(events, [{ event: "TOGGLE", from: "inactive", to: "active" }]);
  assert.equal(service.getSnapshot().value, "inactive");

  const stopped = service.stop();

  assert.equal(stopped.status, "stopped");
  assert.throws(() => service.send("TOGGLE"), FsmError);

  service.start();
  assert.equal(service.getSnapshot().status, "active");
  assert.equal(service.getSnapshot().value, "inactive");
});

test("rejects malformed configs, events, snapshots, and transitions", () => {
  assert.throws(() => createMachine(null), FsmError);
  assert.throws(() => createMachine({ initial: "missing", context: {}, states: {} }), FsmError);
  assert.throws(() => createMachine({ initial: "", context: {}, states: {} }), FsmError);

  const unknownTarget = createMachine({
    initial: "idle",
    context: {},
    states: {
      idle: { on: { GO: "missing" } },
    },
  });

  assert.throws(() => unknownTarget.transition(unknownTarget.initialState, "GO"), FsmError);
  assert.throws(() => unknownTarget.transition(unknownTarget.initialState, ""), FsmError);
  assert.throws(() => unknownTarget.transition({ value: "", context: {}, status: "active" }, "GO"), FsmError);

  const invalidActions = createMachine({
    initial: "idle",
    context: {},
    states: {
      idle: {
        on: {
          GO: {
            action: () => undefined,
            actions: [],
          },
        },
      },
    },
  });

  assert.throws(() => invalidActions.transition(invalidActions.initialState, "GO"), FsmError);

  const invalidGuardAlias = createMachine({
    initial: "idle",
    context: {},
    states: {
      idle: {
        on: {
          GO: {
            guard: () => true,
            cond: () => true,
          },
        },
      },
    },
  });

  assert.throws(() => invalidGuardAlias.transition(invalidGuardAlias.initialState, "GO"), FsmError);
});

test("resolves focused public package subpaths", async () => {
  const root = await import("@ts-zero/fsm");
  const assignModule = await import("@ts-zero/fsm/assign");
  const machineModule = await import("@ts-zero/fsm/machine");
  const serviceModule = await import("@ts-zero/fsm/service");
  const errorsModule = await import("@ts-zero/fsm/errors");
  const typesModule = await import("@ts-zero/fsm/types");
  const xstateModule = await import("@ts-zero/fsm/xstate");

  assert.equal(root.createMachine, createMachine);
  assert.equal(assignModule.assign, assignFromSubpath);
  assert.equal(machineModule.createMachine, createMachineFromSubpath);
  assert.equal(serviceModule.createService, createServiceFromSubpath);
  assert.equal(errorsModule.FsmError, FsmError);
  assert.equal(xstateModule.toXStateConfig, toXStateConfigFromSubpath);
  assert.deepEqual(Object.keys(typesModule), []);
});

test("public barrel remains a re-export-only module for tree-checking", () => {
  const source = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");

  assert.match(source, /^export /m);
  assert.doesNotMatch(source, /function\s+/);
  assert.doesNotMatch(source, /const\s+/);
  assert.doesNotMatch(source, /let\s+/);
  assert.doesNotMatch(source, /class\s+/);
});
