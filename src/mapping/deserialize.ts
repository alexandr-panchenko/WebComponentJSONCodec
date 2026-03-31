import { parseDocumentTree, type NormalizedElement } from "../document/normalize";
import { parseHtmlToAst } from "../syntax/parser";
import type {
  ComponentNode,
  ComponentSchema,
  DeserializeOptions,
  JsonValue,
  SchemaPropertyDefinition,
  SchemaRegistry,
  SchemaType,
} from "../types";
import { deepMerge, getValueAtPath, isPlainObject, setValueAtPath } from "../utils/object";

export function deserializeHtml(
  input: string,
  registry: SchemaRegistry = {},
  options: DeserializeOptions = {},
): ComponentNode | ComponentNode[] {
  const document = parseDocumentTree(parseHtmlToAst(input));
  const effectiveRegistry = {
    ...registry,
    ...createEmbeddedSchemaRegistry(document.schemaPayloads),
  };
  const components = document.roots.map((root) => deserializeElement(root, effectiveRegistry));

  if (options.multipleRoots) {
    return components;
  }

  if (components.length === 0) {
    throw new Error("No root component found");
  }

  const firstComponent = components[0];
  if (!firstComponent) {
    throw new Error("No root component found");
  }
  return firstComponent;
}

function deserializeElement(
  element: NormalizedElement,
  registry: SchemaRegistry,
): ComponentNode {
  const schema = registry[element.tagName];
  const rawProperties = collectRawProperties(element);
  const properties = applySchema(rawProperties, schema);

  return {
    type: element.tagName,
    properties,
    children: element.children.map((child) => deserializeElement(child, registry)),
  };
}

function collectRawProperties(element: NormalizedElement): Record<string, JsonValue> {
  let result: Record<string, JsonValue> = {};

  for (const attribute of element.attributes) {
    setValueAtPath(
      result,
      attribute.normalizedName,
      attribute.boolean ? true : attribute.value,
    );
  }

  for (const script of element.scriptPayloads) {
    let parsed: JsonValue;
    try {
      parsed = JSON.parse(script.content);
    } catch {
      continue;
    }

    if (!isPlainObject(parsed)) {
      continue;
    }

    const fragment = script.targetPath
      ? wrapAtPath(script.targetPath, parsed)
      : parsed;

    result = deepMerge(result, fragment);
  }

  return result;
}

function applySchema(
  rawProperties: Record<string, JsonValue>,
  schema: ComponentSchema | undefined,
): Record<string, JsonValue> {
  if (!schema) {
    return coerceUnknownProperties(rawProperties);
  }

  const result = coerceUnknownProperties(rawProperties);

  for (const [path, definition] of Object.entries(schema.properties)) {
    const rawValue = getValueAtPath(rawProperties, path);
    const coerced = coerceByDefinition(rawValue, definition);
    if (coerced !== undefined) {
      setValueAtPath(result, path, coerced);
    }
  }

  return result;
}

function coerceUnknownProperties(
  rawProperties: Record<string, JsonValue>,
): Record<string, JsonValue> {
  const result: Record<string, JsonValue> = {};
  for (const [key, value] of Object.entries(rawProperties)) {
    result[key] = coerceUnknownValue(value);
  }
  return result;
}

function coerceUnknownValue(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map(coerceUnknownValue);
  }
  if (isPlainObject(value)) {
    const result: Record<string, JsonValue> = {};
    for (const [key, nested] of Object.entries(value)) {
      result[key] = coerceUnknownValue(nested);
    }
    return result;
  }
  if (typeof value !== "string") {
    return value;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  if (value !== "" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return value;
}

function coerceByDefinition(
  rawValue: JsonValue | undefined,
  definition: SchemaPropertyDefinition,
): JsonValue | undefined {
  const defaultValue = definition.default;
  if (rawValue === undefined) {
    return defaultValue;
  }

  const coerced = coerceToType(rawValue, definition.type);
  return coerced === undefined ? defaultValue : coerced;
}

function coerceToType(value: JsonValue, type: SchemaType): JsonValue | undefined {
  switch (type) {
    case "string":
      return typeof value === "string" ? value : undefined;
    case "number":
      if (typeof value === "number") {
        return value;
      }
      if (typeof value === "string" && value !== "" && Number.isFinite(Number(value))) {
        return Number(value);
      }
      return undefined;
    case "boolean":
      if (typeof value === "boolean") {
        return value;
      }
      if (typeof value === "string") {
        if (value === "") {
          return true;
        }
        if (value === "true") {
          return true;
        }
        if (value === "false") {
          return false;
        }
      }
      return undefined;
    case "string[]":
      return coercePrimitiveArray(value, "string");
    case "number[]":
      return coercePrimitiveArray(value, "number");
    case "boolean[]":
      return coercePrimitiveArray(value, "boolean");
    case "number[][]":
      if (
        Array.isArray(value) &&
        value.every(
          (item) =>
            Array.isArray(item) && item.every((nested) => typeof nested === "number"),
        )
      ) {
        return value;
      }
      return undefined;
    case "json":
      return value;
  }
}

function coercePrimitiveArray(
  value: JsonValue,
  itemType: "string" | "number" | "boolean",
): JsonValue | undefined {
  if (Array.isArray(value)) {
    if (itemType === "string" && value.every((item) => typeof item === "string")) {
      return value;
    }
    if (itemType === "number" && value.every((item) => typeof item === "number")) {
      return value;
    }
    if (itemType === "boolean" && value.every((item) => typeof item === "boolean")) {
      return value;
    }
    return undefined;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  if (value === "") {
    return [];
  }

  const items = value.split(",").map((item) => item.trim());

  switch (itemType) {
    case "string":
      return items;
    case "number":
      return items.every((item) => Number.isFinite(Number(item)))
        ? items.map((item) => Number(item))
        : undefined;
    case "boolean":
      return items.every((item) => item === "true" || item === "false")
        ? items.map((item) => item === "true")
        : undefined;
  }
}

function wrapAtPath(
  path: string,
  value: Record<string, JsonValue>,
): Record<string, JsonValue> {
  const root: Record<string, JsonValue> = {};
  setValueAtPath(root, path, value);
  return root;
}

function createEmbeddedSchemaRegistry(
  schemaPayloads: Array<{ componentType: string; content: string }>,
): SchemaRegistry {
  const registry: SchemaRegistry = {};

  for (const payload of schemaPayloads) {
    let parsed: JsonValue;
    try {
      parsed = JSON.parse(payload.content);
    } catch {
      continue;
    }

    if (!isPlainObject(parsed)) {
      continue;
    }

    const properties: ComponentSchema["properties"] = {};
    for (const [path, definition] of Object.entries(parsed)) {
      if (!isPlainObject(definition)) {
        continue;
      }

      const type = definition.type;
      if (!isSchemaType(type)) {
        continue;
      }

      const defaultValue = definition.default;

      properties[path] = {
        type,
        ...(Object.prototype.hasOwnProperty.call(definition, "default") &&
        defaultValue !== undefined
          ? { default: defaultValue }
          : {}),
      };
    }

    registry[payload.componentType] = {
      type: payload.componentType,
      properties,
    };
  }

  return registry;
}

function isSchemaType(value: JsonValue | undefined): value is SchemaType {
  return (
    value === "string" ||
    value === "number" ||
    value === "boolean" ||
    value === "string[]" ||
    value === "number[]" ||
    value === "boolean[]" ||
    value === "number[][]" ||
    value === "json"
  );
}
