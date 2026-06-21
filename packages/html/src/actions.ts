import { fail } from "./errors.js";
import type { ActionPayload, FormPayload, StoreLike, TransitionName } from "./types.js";

export function action<State, EventType extends Event = Event, Payload = unknown>(
  store: StoreLike<State>,
  type: TransitionName,
  payload?: ActionPayload<EventType, Payload>,
): (event: EventType) => void {
  validateStore(store);
  validateActionType(type);

  return (event) => {
    const value = typeof payload === "function" ? (payload as (event: EventType) => Payload)(event) : payload;
    store.dispatch(type, value);
  };
}

export function formAction<State, Payload = FormData>(
  store: StoreLike<State>,
  type: TransitionName,
  payload?: FormPayload<Payload>,
): (event: SubmitEvent) => void {
  validateStore(store);
  validateActionType(type);

  return (event) => {
    event.preventDefault();

    const form = event.currentTarget;

    if (!(form instanceof HTMLFormElement)) {
      fail("Expected formAction to be attached to a form submit event");
    }

    const data = new FormData(form);
    const value = typeof payload === "function"
      ? (payload as (form: HTMLFormElement, data: FormData, event: SubmitEvent) => Payload)(form, data, event)
      : (payload ?? data);
    store.dispatch(type, value);
  };
}

function validateStore<State>(store: StoreLike<State>): void {
  if (store === null || typeof store !== "object" || typeof store.dispatch !== "function") {
    fail("Expected a @ts-zero/store instance");
  }
}

function validateActionType(type: TransitionName): void {
  if (typeof type !== "string" || type.length === 0) {
    fail("Expected action type to be a non-empty string");
  }
}
