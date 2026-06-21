export class StoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StoreError";
  }
}

export function fail(message: string): never {
  throw new StoreError(message);
}
