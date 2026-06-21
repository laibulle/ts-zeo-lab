export class RuntimeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RuntimeError";
  }
}

export function fail(message: string): never {
  throw new RuntimeError(message);
}
