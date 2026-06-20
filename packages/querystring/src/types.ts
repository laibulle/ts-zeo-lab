export type QueryPrimitive = string;

export interface QueryArray extends Array<QueryPrimitive> {}

export interface QueryObject {
  [key: string]: QueryPrimitive | QueryArray | QueryObject;
}

export type ParsedQuery = QueryObject;

export type StringifiablePrimitive = string | number | boolean | null | undefined;

export interface StringifiableArray extends Array<StringifiablePrimitive> {}

export interface StringifiableObject {
  [key: string]: StringifiablePrimitive | StringifiableArray | StringifiableObject;
}

export interface ParseQueryOptions {
  readonly delimiter?: string;
  readonly depth?: number;
  readonly parameterLimit?: number;
  readonly plusAsSpace?: boolean;
}

export interface StringifyQueryOptions {
  readonly delimiter?: string;
  readonly encode?: boolean;
  readonly depth?: number;
}
