const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export function isForbiddenKey(key: string): boolean {
  return FORBIDDEN_KEYS.has(key);
}

export function createNullObject(): Record<string, unknown> {
  return Object.create(null) as Record<string, unknown>;
}
