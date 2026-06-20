export type UUID = string & { readonly __uuidBrand: unique symbol };

export type RandomBytes = Uint8Array | readonly number[];

export type RandomBytesFactory = () => RandomBytes;

export type UUIDName = string | Uint8Array | readonly number[];

export interface V1Options {
  node?: RandomBytes;
  clockseq?: number;
  msecs?: number;
  nsecs?: number;
  random?: RandomBytes;
  rng?: RandomBytesFactory;
}

export interface V4Options {
  random?: RandomBytes;
  rng?: RandomBytesFactory;
}

export interface V7Options {
  msecs?: number;
  random?: RandomBytes;
  rng?: RandomBytesFactory;
  seq?: number;
}
