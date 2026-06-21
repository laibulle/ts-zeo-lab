export class NodeServerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NodeServerError";
  }
}

export function fail(message: string): never {
  throw new NodeServerError(message);
}
