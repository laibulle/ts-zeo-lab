export class FsmError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FsmError";
  }
}

export function fail(message: string): never {
  throw new FsmError(message);
}
