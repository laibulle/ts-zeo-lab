import type { Action, AssignInput, EventObject, StateValue } from "./types.js";

export function assign<Context extends object, Event extends EventObject, State extends StateValue = StateValue>(
  input: AssignInput<Context, Event>,
): Action<Context, Event, State> {
  return (context, event) => {
    const patch = typeof input === "function" ? input(context, event) : input;
    return {
      ...context,
      ...patch,
    };
  };
}
