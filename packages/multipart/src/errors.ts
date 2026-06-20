export class MultipartError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MultipartError";
  }
}

export function fail(message: string): never {
  throw new MultipartError(message);
}
