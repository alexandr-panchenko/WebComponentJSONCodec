import type {
  ComponentNode,
  ComponentSchema,
  JsonValue,
  SchemaRegistry,
  SerializeOptions,
} from "../types";
import { escapeHtmlAttribute } from "../utils/html";
import { getValueAtPath, isPlainObject, setValueAtPath, sortObject } from "../utils/object";

const DEFAULT_INDENT = "  ";

export function serializeJson(
  nodeOrNodes: ComponentNode | ComponentNode[],
  registry: SchemaRegistry = {},
  options: SerializeOptions = {},
): string {
  const indent = options.indent ?? DEFAULT_INDENT;
  const nodes = Array.isArray(nodeOrNodes) ? nodeOrNodes : [nodeOrNodes];
  return nodes
    .map((node) => serializeNode(node, registry[node.type], registry, options.includeDefaults ?? false, 0, indent))
    .join("\n");
}

function serializeNode(
  node: ComponentNode,
  schema: ComponentSchema | undefined,
  registry: SchemaRegistry,
  includeDefaults: boolean,
  depth: number,
  indent: string,
): string {
  const scalarAttributes = collectScalarAttributes(node.properties, schema, includeDefaults);
  const scriptPayload = collectComplexProperties(node.properties, schema, includeDefaults);
  const orderedAttributes = Object.entries(scalarAttributes).sort(([left], [right]) => left.localeCompare(right));
  const attributeText = orderedAttributes
    .map(([name, value]) => formatAttribute(name, value))
    .join("");

  const childMarkup = node.children.map((child) =>
    serializeNode(child, registry[child.type], registry, includeDefaults, depth + 1, indent),
  );

  const scriptMarkup = scriptPayload
    ? [`${indent.repeat(depth + 1)}<script type="application/json">\n${indent.repeat(depth + 2)}${JSON.stringify(sortObject(scriptPayload), null, 2).replaceAll("\n", `\n${indent.repeat(depth + 2)}`)}\n${indent.repeat(depth + 1)}</script>`]
    : [];

  if (childMarkup.length === 0 && scriptMarkup.length === 0) {
    return `${indent.repeat(depth)}<${node.type}${attributeText}></${node.type}>`;
  }

  const contents = [...scriptMarkup, ...childMarkup].join("\n");
  return `${indent.repeat(depth)}<${node.type}${attributeText}>\n${contents}\n${indent.repeat(depth)}</${node.type}>`;
}

function collectScalarAttributes(
  properties: Record<string, JsonValue>,
  schema: ComponentSchema | undefined,
  includeDefaults: boolean,
): Record<string, string | true> {
  const result: Record<string, string | true> = {};
  const consumed = new Set<string>();

  if (schema) {
    for (const [path, definition] of Object.entries(schema.properties)) {
      const value = getValueAtPath(properties, path);
      if (value === undefined) {
        continue;
      }
      if (!includeDefaults && definition.default !== undefined && JSON.stringify(value) === JSON.stringify(definition.default)) {
        continue;
      }
      const formatted = formatScalarForAttribute(value);
      if (formatted !== undefined) {
        result[path] = formatted;
        consumed.add(path.split(".")[0] ?? path);
      }
    }
  }

  for (const [key, value] of Object.entries(properties)) {
    if (consumed.has(key)) {
      continue;
    }
    const formatted = formatScalarForAttribute(value);
    if (formatted !== undefined) {
      result[key] = formatted;
    }
  }

  return result;
}

function collectComplexProperties(
  properties: Record<string, JsonValue>,
  schema: ComponentSchema | undefined,
  includeDefaults: boolean,
): Record<string, JsonValue> | undefined {
  const result: Record<string, JsonValue> = {};

  if (schema) {
    for (const [path, definition] of Object.entries(schema.properties)) {
      const value = getValueAtPath(properties, path);
      if (value === undefined) {
        continue;
      }
      if (!includeDefaults && definition.default !== undefined && JSON.stringify(value) === JSON.stringify(definition.default)) {
        continue;
      }
      if (formatScalarForAttribute(value) === undefined) {
        setValueAtPath(result, path, value);
      }
    }
  }

  for (const [key, value] of Object.entries(properties)) {
    if (schema && key in schema.properties) {
      continue;
    }
    if (formatScalarForAttribute(value) === undefined) {
      result[key] = value;
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function formatScalarForAttribute(value: JsonValue): string | true | undefined {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (typeof value === "boolean") {
    return value ? true : "false";
  }
  if (Array.isArray(value) && value.every((item) => typeof item === "string" || typeof item === "number" || typeof item === "boolean")) {
    return value.join(",");
  }
  if (isPlainObject(value)) {
    return undefined;
  }
  return undefined;
}

function formatAttribute(name: string, value: string | true): string {
  if (value === true) {
    return ` ${name}`;
  }
  return ` ${name}="${escapeHtmlAttribute(value)}"`;
}
