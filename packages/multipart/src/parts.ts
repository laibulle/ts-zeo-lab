import type { MultipartBytes, MultipartField, MultipartFile } from "./types.js";

export function field(name: string, value: string | number | boolean): MultipartField {
  return {
    kind: "field",
    name,
    value: String(value),
  };
}

export function file(name: string, filename: string, body: MultipartBytes, contentType?: string): MultipartFile {
  return {
    kind: "file",
    name,
    filename,
    body,
    contentType,
  };
}
