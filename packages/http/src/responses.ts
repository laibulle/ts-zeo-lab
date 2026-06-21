export function text(body: string, init: ResponseInit = {}): Response {
  return withContentType(body, "text/plain; charset=utf-8", init);
}

export function html(body: string, init: ResponseInit = {}): Response {
  return withContentType(body, "text/html; charset=utf-8", init);
}

export function json(value: unknown, init: ResponseInit = {}): Response {
  return withContentType(JSON.stringify(value), "application/json; charset=utf-8", init);
}

export function redirect(location: string, status = 302): Response {
  if (status < 300 || status > 399) {
    throw new TypeError("Redirect status must be between 300 and 399");
  }

  return new Response(null, {
    status,
    headers: {
      location,
    },
  });
}

export function noContent(init: ResponseInit = {}): Response {
  return new Response(null, {
    ...init,
    status: init.status ?? 204,
  });
}

function withContentType(body: BodyInit, contentType: string, init: ResponseInit): Response {
  const headers = new Headers(init.headers);

  if (!headers.has("content-type")) {
    headers.set("content-type", contentType);
  }

  return new Response(body, {
    ...init,
    headers,
  });
}
