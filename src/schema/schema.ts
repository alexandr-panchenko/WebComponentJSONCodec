import type { ComponentSchema, JsonValue, SchemaPropertyDefinition, SchemaRegistry, SchemaType } from "../types";

export interface SchemaPropertyInput {
  property: string;
  type: SchemaType;
  default?: JsonValue;
}

export function defineComponentSchema(
  type: string,
  properties: SchemaPropertyInput[],
): ComponentSchema {
  const entries: Record<string, SchemaPropertyDefinition> = {};
  for (const property of properties) {
    entries[property.property] = {
      type: property.type,
      ...(property.default !== undefined ? { default: property.default } : {}),
    };
  }

  return {
    type,
    properties: entries,
  };
}

export function createSchemaRegistry(
  schemas: ComponentSchema[],
): SchemaRegistry {
  return Object.fromEntries(schemas.map((schema) => [schema.type, schema]));
}
