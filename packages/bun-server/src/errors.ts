export class BunServerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BunServerError";
  }
}

export function fail(message: string): never {
  throw new BunServerError(message);
}
