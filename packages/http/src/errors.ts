export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message?: string) {
    super(message ?? defaultStatusText(status));
    this.name = "HttpError";
    this.status = status;
  }
}

export function httpError(status: number, message?: string): HttpError {
  return new HttpError(status, message);
}

export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError;
}

export function defaultStatusText(status: number): string {
  if (status === 400) return "Bad Request";
  if (status === 401) return "Unauthorized";
  if (status === 403) return "Forbidden";
  if (status === 404) return "Not Found";
  if (status === 405) return "Method Not Allowed";
  if (status === 500) return "Internal Server Error";

  return "HTTP Error";
}
