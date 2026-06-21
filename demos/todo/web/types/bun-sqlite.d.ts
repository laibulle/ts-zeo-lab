declare module "bun:sqlite" {
  export class Database {
    constructor(file: string, options?: { readonly create?: boolean });
    exec(sql: string): unknown;
    prepare?(sql: string): Statement;
    query?(sql: string): Statement;
    close(): void;
  }

  export interface Statement {
    all(...params: readonly unknown[]): readonly Record<string, unknown>[];
    get(...params: readonly unknown[]): Record<string, unknown> | undefined;
    run(...params: readonly unknown[]): unknown;
  }
}
