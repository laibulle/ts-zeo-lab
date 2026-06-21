import type { EventObject, Machine, MachineConfig, StateValue } from "./types.js";

export function defineXStateConfig<Context, Event extends EventObject, State extends StateValue = StateValue>(
  config: MachineConfig<Context, Event, State>,
): MachineConfig<Context, Event, State> {
  return config;
}

export function toXStateConfig<Context, Event extends EventObject, State extends StateValue = StateValue>(
  machineOrConfig: Machine<Context, Event, State> | MachineConfig<Context, Event, State>,
): MachineConfig<Context, Event, State> {
  return "config" in machineOrConfig ? machineOrConfig.config : machineOrConfig;
}
