import type { JsonValue } from "../types";

export function isPlainObject(value: unknown): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function cloneJson<T extends JsonValue | Record<string, JsonValue>>(value: T): T {
  return structuredClone(value);
}

export function deepMerge(
  base: Record<string, JsonValue>,
  addition: Record<string, JsonValue>,
): Record<string, JsonValue> {
  const result = cloneJson(base);

  for (const [key, value] of Object.entries(addition)) {
    const existing = result[key];
    if (isPlainObject(existing) && isPlainObject(value)) {
      result[key] = deepMerge(existing, value);
      continue;
    }
    result[key] = cloneJson(value);
  }

  return result;
}

export function getValueAtPath(
  source: Record<string, JsonValue>,
  path: string,
): JsonValue | undefined {
  const parts = path.split(".");
  let current: unknown = source;

  for (const part of parts) {
    if (!isPlainObject(current) || !(part in current)) {
      return undefined;
    }
    current = current[part];
  }

  return current as JsonValue;
}

export function setValueAtPath(
  target: Record<string, JsonValue>,
  path: string,
  value: JsonValue,
): void {
  const parts = path.split(".");
  let current: Record<string, JsonValue> = target;

  for (const part of parts.slice(0, -1)) {
    const existing = current[part];
    if (!isPlainObject(existing)) {
      current[part] = {};
    }
    current = current[part] as Record<string, JsonValue>;
  }

  const leaf = parts[parts.length - 1];
  if (!leaf) {
    return;
  }
  current[leaf] = value;
}

export function deleteValueAtPath(
  target: Record<string, JsonValue>,
  path: string,
): void {
  const parts = path.split(".");
  deleteAtPath(target, parts, 0);
}

function deleteAtPath(
  target: Record<string, JsonValue>,
  parts: string[],
  index: number,
): boolean {
  const part = parts[index];
  if (!part) {
    return Object.keys(target).length === 0;
  }

  if (index === parts.length - 1) {
    delete target[part];
    return Object.keys(target).length === 0;
  }

  const next = target[part];
  if (!isPlainObject(next)) {
    return Object.keys(target).length === 0;
  }

  const shouldDeleteChild = deleteAtPath(next, parts, index + 1);
  if (shouldDeleteChild) {
    delete target[part];
  }

  return Object.keys(target).length === 0;
}

export function sortObject(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map(sortObject);
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const result: Record<string, JsonValue> = {};
  for (const key of Object.keys(value).sort()) {
    const nextValue = value[key];
    if (nextValue !== undefined) {
      result[key] = sortObject(nextValue);
    }
  }
  return result;
}
