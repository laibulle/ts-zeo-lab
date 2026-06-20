export type MultipartBytes = Uint8Array | ArrayBuffer | readonly number[];

export interface MultipartField {
  readonly kind: "field";
  readonly name: string;
  readonly value: string;
}

export interface MultipartFile {
  readonly kind: "file";
  readonly name: string;
  readonly filename: string;
  readonly body: MultipartBytes;
  readonly contentType?: string;
}

export type MultipartPart = MultipartField | MultipartFile;

export interface EncodeMultipartOptions {
  readonly boundary?: string;
}

export interface EncodedMultipart {
  readonly boundary: string;
  readonly contentType: string;
  readonly bytes: Uint8Array;
}

export type RandomBytes = (target: Uint8Array) => Uint8Array;
