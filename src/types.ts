export type PrimitiveValue = string | number | boolean | null;
export type JsonValue =
  | PrimitiveValue
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface AttributeNode {
  name: string;
  value: string;
  quote: '"' | "'" | null;
  boolean: boolean;
}

export interface ElementNode {
  kind: "element";
  tagName: string;
  attributes: AttributeNode[];
  children: SyntaxNode[];
}

export interface TextNode {
  kind: "text";
  value: string;
}

export interface CommentNode {
  kind: "comment";
  value: string;
}

export type SyntaxNode = ElementNode | TextNode | CommentNode;

export interface DocumentNode {
  roots: SyntaxNode[];
}

export type SchemaType =
  | "string"
  | "number"
  | "boolean"
  | "string[]"
  | "number[]"
  | "boolean[]"
  | "number[][]"
  | "json";

export interface SchemaPropertyDefinition {
  type: SchemaType;
  default?: JsonValue;
}

export interface ComponentSchema {
  type: string;
  properties: Record<string, SchemaPropertyDefinition>;
}

export type SchemaRegistry = Record<string, ComponentSchema>;

export interface ComponentNode {
  type: string;
  properties: Record<string, JsonValue>;
  children: ComponentNode[];
}

export interface DeserializeOptions {
  multipleRoots?: boolean;
}

export interface SerializeOptions {
  includeDefaults?: boolean;
  indent?: string;
}

export interface SerializeDocumentOptions extends SerializeOptions {
  title?: string;
}
