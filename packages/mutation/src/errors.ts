export class MutationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MutationError";
  }
}

export function fail(message: string): never {
  throw new MutationError(message);
}
