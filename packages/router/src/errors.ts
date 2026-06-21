export class RouterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RouterError";
  }
}

export function fail(message: string): never {
  throw new RouterError(message);
}
