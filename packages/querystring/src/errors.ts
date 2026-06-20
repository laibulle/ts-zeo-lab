export class QuerystringError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuerystringError";
  }
}

export function fail(message: string): never {
  throw new QuerystringError(message);
}
