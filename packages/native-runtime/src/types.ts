export type Serializable =
  | null
  | boolean
  | number
  | string
  | readonly Serializable[]
  | { readonly [key: string]: Serializable };

export interface NativeHandle {
  readonly kind: string;
  readonly id: string;
  readonly meta?: Serializable;
  readonly nativeHandle: true;
}

export interface RuntimeRequestMessage {
  readonly kind: "request";
  readonly id: string;
  readonly capability: string;
  readonly operation: string;
  readonly payload?: Serializable;
}

export interface RuntimeEventMessage {
  readonly kind: "event";
  readonly name: string;
  readonly payload?: Serializable;
}

export type RuntimeMessage = RuntimeRequestMessage | RuntimeEventMessage;

export interface RuntimeResponseMessage {
  readonly kind: "response";
  readonly id: string;
  readonly ok: boolean;
  readonly value?: Serializable;
  readonly error?: string;
}

export interface HostEventMessage {
  readonly kind: "event";
  readonly name: string;
  readonly payload?: Serializable;
}

export type HostMessage = RuntimeResponseMessage | HostEventMessage;

export type Unsubscribe = () => void;

export interface HostChannel {
  send(message: RuntimeMessage): void;
  subscribe(listener: (message: HostMessage) => void): Unsubscribe;
}

export interface NativeRuntimeOptions {
  readonly channel: HostChannel;
  readonly createId?: () => string;
}

export interface NativeRuntime {
  request(capability: string, operation: string, payload?: Serializable): Promise<Serializable | undefined>;
  emit(name: string, payload?: Serializable): void;
  receive(message: HostMessage): void;
  subscribe(listener: (message: HostMessage) => void): Unsubscribe;
  destroy(reason?: string): void;
}
