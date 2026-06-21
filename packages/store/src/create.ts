import { StoreError, fail } from "./errors.js";
import { deepFreeze } from "./freeze.js";
import { assertVersion, createReplacePatch, createSnapshot } from "./snapshot.js";
import type {
  CreateStoreOptions,
  DispatchResult,
  Equality,
  Selector,
  Store,
  StoreAction,
  StoreContext,
  StoreListener,
  StoreMeta,
  StorePatch,
  StoreSnapshot,
  StoreVersion,
  SubscribeOptions,
  TransitionName,
  Transitions,
  Unsubscribe,
} from "./types.js";

interface Subscription<State, Selected = unknown> {
  readonly selector: Selector<State, Selected>;
  readonly listener: StoreListener<Selected>;
  readonly equals: Equality<Selected>;
  selected: Selected;
  active: boolean;
}

const DEFAULT_VERSION = 0;

export function createStore<State, Context extends StoreContext = StoreContext>(
  options: CreateStoreOptions<State, Context>,
): Store<State> {
  validateOptions(options);

  const transitions = options.transitions;
  const context = (options.context ?? {}) as Context;
  const freeze = options.freeze ?? false;
  const subscriptions: Subscription<State>[] = [];
  let currentVersion = options.version ?? DEFAULT_VERSION;
  let state = prepareState(options.state, freeze);

  const store: Store<State> = {
    getState: () => state,
    version: () => currentVersion,
    snapshot: () => createSnapshot(currentVersion, state),
    dispatch: ((typeOrAction: TransitionName | StoreAction, payload?: unknown) => {
      const action = normalizeAction(typeOrAction, payload);
      return dispatchAction(action);
    }) as Store<State>["dispatch"],
    hydrate: (snapshot) => {
      validateSnapshot(snapshot);
      const previousVersion = currentVersion;
      const previousState = state;
      currentVersion = snapshot.version;
      state = prepareState(snapshot.state, freeze);
      notify(previousState, {
        version: currentVersion,
        previousVersion,
        source: "hydrate",
      });
      return createSnapshot(currentVersion, state);
    },
    applyPatch: (patch) => {
      validatePatch(patch);

      if (patch.from !== currentVersion) {
        fail("Patch source version does not match store version");
      }

      const previousVersion = currentVersion;
      const previousState = state;
      currentVersion = patch.to;
      state = prepareState(patch.state, freeze);
      notify(previousState, {
        version: currentVersion,
        previousVersion,
        source: "patch",
      });
      return createSnapshot(currentVersion, state);
    },
    subscribe: (selector, listener, subscribeOptions) => subscribe(selector, listener, subscribeOptions),
  };

  function dispatchAction<Payload>(action: StoreAction<Payload>): DispatchResult<State, Payload> {
    validateAction(action);

    if (action.baseVersion !== undefined && action.baseVersion !== currentVersion) {
      return {
        ok: false,
        reason: "version_conflict",
        version: currentVersion,
        expectedVersion: action.baseVersion,
      };
    }

    const transition = transitions[action.type];

    if (transition === undefined) {
      fail(`Unknown transition: ${action.type}`);
    }

    const previousVersion = currentVersion;
    const previousState = state;
    const nextState = prepareState(transition(state, action.payload, context), freeze);

    if (Object.is(previousState, nextState)) {
      return {
        ok: true,
        noop: true,
        version: currentVersion,
        previousVersion,
        action,
        state,
      };
    }

    currentVersion += 1;
    state = nextState;
    const patch = createReplacePatch(previousVersion, currentVersion, state);
    notify(previousState, {
      version: currentVersion,
      previousVersion,
      source: "dispatch",
      action,
    });

    return {
      ok: true,
      version: currentVersion,
      previousVersion,
      action,
      patch,
      state,
    };
  }

  function subscribe<Selected>(
    selector: Selector<State, Selected>,
    listener: StoreListener<Selected>,
    subscribeOptions: SubscribeOptions<Selected> = {},
  ): Unsubscribe {
    if (typeof selector !== "function") {
      fail("Expected selector to be a function");
    }

    if (typeof listener !== "function") {
      fail("Expected listener to be a function");
    }

    const subscription: Subscription<State, Selected> = {
      selector,
      listener,
      equals: subscribeOptions.equals ?? Object.is,
      selected: selector(state),
      active: true,
    };

    subscriptions.push(subscription as Subscription<State>);

    if (subscribeOptions.fireImmediately === true) {
      listener(subscription.selected, subscription.selected, {
        version: currentVersion,
        previousVersion: currentVersion,
        source: "hydrate",
      });
    }

    return () => {
      subscription.active = false;
      const index = subscriptions.indexOf(subscription as Subscription<State>);

      if (index !== -1) {
        subscriptions.splice(index, 1);
      }
    };
  }

  function notify(previousState: State, meta: StoreMeta): void {
    if (Object.is(previousState, state) && meta.source !== "hydrate" && meta.source !== "patch") {
      return;
    }

    const snapshot = subscriptions.slice();

    for (const subscription of snapshot) {
      if (!subscription.active) {
        continue;
      }

      const previousSelected = subscription.selected;
      const nextSelected = subscription.selector(state);

      if (subscription.equals(previousSelected, nextSelected)) {
        continue;
      }

      subscription.selected = nextSelected;
      subscription.listener(nextSelected, previousSelected, meta);
    }
  }

  return store;
}

function normalizeAction<Payload>(typeOrAction: TransitionName | StoreAction<Payload>, payload: Payload): StoreAction<Payload> {
  if (typeof typeOrAction === "string") {
    return {
      type: typeOrAction,
      payload,
    };
  }

  return typeOrAction;
}

function prepareState<State>(state: State, freeze: boolean): State {
  return freeze ? deepFreeze(state) : state;
}

function validateOptions<State, Context extends StoreContext>(options: CreateStoreOptions<State, Context>): void {
  if (options === null || typeof options !== "object") {
    fail("Expected store options");
  }

  if (options.transitions === null || typeof options.transitions !== "object") {
    fail("Expected transitions object");
  }

  for (const [name, transition] of Object.entries(options.transitions as Transitions<State, Context>)) {
    if (name.length === 0) {
      fail("Transition names must be non-empty strings");
    }

    if (typeof transition !== "function") {
      fail(`Expected transition to be a function: ${name}`);
    }
  }

  if (options.version !== undefined) {
    assertVersion(options.version, "store version");
  }
}

function validateAction(action: StoreAction): void {
  if (action === null || typeof action !== "object") {
    fail("Expected store action");
  }

  if (typeof action.type !== "string" || action.type.length === 0) {
    fail("Expected action type to be a non-empty string");
  }

  if (action.baseVersion !== undefined) {
    assertVersion(action.baseVersion, "action baseVersion");
  }
}

function validateSnapshot<State>(snapshot: StoreSnapshot<State>): void {
  if (snapshot === null || typeof snapshot !== "object") {
    fail("Expected store snapshot");
  }

  assertVersion(snapshot.version, "snapshot version");
}

function validatePatch<State>(patch: StorePatch<State>): void {
  if (patch === null || typeof patch !== "object") {
    fail("Expected store patch");
  }

  if (patch.kind !== "replace") {
    fail("Unsupported store patch kind");
  }

  assertVersion(patch.from, "patch from version");
  assertVersion(patch.to, "patch to version");

  if (patch.to <= patch.from) {
    fail("Patch target version must be greater than source version");
  }
}

export { StoreError };
