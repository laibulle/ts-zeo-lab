export class HtmlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HtmlError";
  }
}

export function fail(message: string): never {
  throw new HtmlError(message);
}
