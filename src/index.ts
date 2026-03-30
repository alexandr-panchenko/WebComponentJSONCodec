export { parseHtmlToAst } from "./syntax/parser";
export { parseDocument } from "./parseDocument";
export { deserializeHtml } from "./mapping/deserialize";
export { serializeJson } from "./serialization/serialize";
export { createSchemaRegistry, defineComponentSchema } from "./schema/schema";
export type {
  ComponentNode,
  ComponentSchema,
  DeserializeOptions,
  DocumentNode,
  ElementNode,
  JsonValue,
  SchemaRegistry,
  SerializeOptions,
  SyntaxNode,
} from "./types";
