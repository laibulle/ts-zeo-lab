import { asBytes, concat, utf8 } from "./bytes.js";
import { createBoundary } from "./boundary.js";
import { fail } from "./errors.js";
import { assertBoundary, assertBoundaryNotInBody, assertContentType, assertHeaderParameter } from "./validation.js";
import type { EncodedMultipart, EncodeMultipartOptions, MultipartPart } from "./types.js";

const CRLF = "\r\n";
const DEFAULT_FILE_CONTENT_TYPE = "application/octet-stream";

export function encodeMultipart(parts: readonly MultipartPart[], options: EncodeMultipartOptions = {}): EncodedMultipart {
  if (!Array.isArray(parts)) {
    fail("Expected multipart parts to be an array");
  }

  const boundary = options.boundary ?? createBoundary();
  assertBoundary(boundary);

  const chunks: Uint8Array[] = [];

  for (const part of parts) {
    chunks.push(utf8(`--${boundary}${CRLF}`));

    if (part.kind === "field") {
      chunks.push(encodeField(part, boundary));
      continue;
    }

    if (part.kind === "file") {
      chunks.push(encodeFile(part, boundary));
      continue;
    }

    fail("Unknown multipart part kind");
  }

  chunks.push(utf8(`--${boundary}--${CRLF}`));

  return {
    boundary,
    contentType: `multipart/form-data; boundary=${boundary}`,
    bytes: concat(chunks),
  };
}

function encodeField(part: MultipartPart, boundary: string): Uint8Array {
  if (part.kind !== "field") {
    fail("Expected multipart field");
  }

  assertHeaderParameter("field name", part.name);

  if (typeof part.value !== "string") {
    fail("Expected multipart field value to be a string");
  }

  const body = utf8(part.value);
  assertBoundaryNotInBody(boundary, body);

  return concat([
    utf8(`Content-Disposition: form-data; name="${part.name}"${CRLF}${CRLF}`),
    body,
    utf8(CRLF),
  ]);
}

function encodeFile(part: MultipartPart, boundary: string): Uint8Array {
  if (part.kind !== "file") {
    fail("Expected multipart file");
  }

  assertHeaderParameter("file field name", part.name);
  assertHeaderParameter("filename", part.filename);

  const contentType = part.contentType ?? DEFAULT_FILE_CONTENT_TYPE;
  assertContentType(contentType);
  const body = asBytes(part.body);
  assertBoundaryNotInBody(boundary, body);

  return concat([
    utf8(
      `Content-Disposition: form-data; name="${part.name}"; filename="${part.filename}"${CRLF}` +
        `Content-Type: ${contentType}${CRLF}${CRLF}`,
    ),
    body,
    utf8(CRLF),
  ]);
}
