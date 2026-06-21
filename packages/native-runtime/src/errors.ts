export class NativeRuntimeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NativeRuntimeError";
  }
}

export function fail(message: string): never {
  throw new NativeRuntimeError(message);
}
