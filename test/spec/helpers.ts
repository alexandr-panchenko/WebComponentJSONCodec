import { defineComponentSchema, type ComponentSchema } from "../../src/index";
import type { JsonValue, SchemaType } from "../../src/types";

export interface TableRow {
  Property: string;
  Type: SchemaType;
  Default?: string;
}

export function schemaFromTable(type: string, rows: TableRow[]): ComponentSchema {
  return defineComponentSchema(
    type,
    rows.map((row) => ({
      property: row.Property,
      type: row.Type,
      ...(row.Default !== undefined ? { default: parseDefault(row.Type, row.Default) } : {}),
    })),
  );
}

function parseDefault(type: SchemaType, raw: string): JsonValue {
  switch (type) {
    case "string":
      return stripQuotes(raw);
    case "number":
      return Number(raw);
    case "boolean":
      return raw === "true";
    case "string[]":
    case "number[]":
    case "boolean[]":
    case "number[][]":
    case "json":
      return JSON.parse(raw);
  }
}

function stripQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}
