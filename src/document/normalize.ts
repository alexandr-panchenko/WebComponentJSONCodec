import type { AttributeNode, DocumentNode, ElementNode, JsonValue, SyntaxNode } from "../types";

export interface NormalizedAttribute {
  originalName: string;
  normalizedName: string;
  value: string;
  boolean: boolean;
}

export interface NormalizedElement {
  tagName: string;
  attributes: NormalizedAttribute[];
  scriptPayloads: Array<{ content: string; targetPath: string | undefined }>;
  children: NormalizedElement[];
}

export interface NormalizedSchemaPayload {
  componentType: string;
  content: string;
}

export interface NormalizedDocument {
  roots: NormalizedElement[];
  schemaPayloads: NormalizedSchemaPayload[];
}

export function parseDocumentTree(document: DocumentNode): NormalizedDocument {
  const roots: NormalizedElement[] = [];
  const schemaPayloads: NormalizedSchemaPayload[] = [];

  for (const node of document.roots) {
    if (node.kind === "comment") {
      continue;
    }
    if (node.kind === "text") {
      continue;
    }
    if (node.tagName.toLowerCase() === "html") {
      const normalizedHtml = normalizeHtmlDocument(node);
      roots.push(...normalizedHtml.roots);
      schemaPayloads.push(...normalizedHtml.schemaPayloads);
      continue;
    }
    roots.push(normalizeElement(node));
  }

  return {
    roots,
    schemaPayloads,
  };
}

function normalizeHtmlDocument(node: ElementNode): NormalizedDocument {
  const roots: NormalizedElement[] = [];
  const schemaPayloads: NormalizedSchemaPayload[] = [];

  for (const child of node.children) {
    if (child.kind === "comment" || child.kind === "text") {
      continue;
    }

    const tagName = child.tagName.toLowerCase();
    if (tagName === "head") {
      schemaPayloads.push(...collectSchemaPayloads(child));
      continue;
    }
    if (tagName === "body") {
      roots.push(...child.children.flatMap(normalizeRootNode));
      continue;
    }

    roots.push(normalizeElement(child));
  }

  return {
    roots,
    schemaPayloads,
  };
}

function normalizeRootNode(node: SyntaxNode): NormalizedElement[] {
  if (node.kind !== "element") {
    return [];
  }
  return [normalizeElement(node)];
}

function normalizeElement(node: ElementNode): NormalizedElement {
  const scriptPayloads: Array<{ content: string; targetPath: string | undefined }> = [];
  const children: NormalizedElement[] = [];

  for (const child of node.children) {
    if (child.kind === "comment") {
      continue;
    }
    if (child.kind === "text") {
      continue;
    }
    if (child.tagName.toLowerCase() === "script") {
      const type = getAttributeValue(child.attributes, "type")?.toLowerCase();
      if (type === "application/json") {
        scriptPayloads.push({
          targetPath: getAttributeValue(child.attributes, "data-property"),
          content: child.children
            .filter((grandchild): grandchild is Extract<SyntaxNode, { kind: "text" }> => grandchild.kind === "text")
            .map((grandchild) => grandchild.value)
            .join(""),
        });
      }
      continue;
    }
    children.push(normalizeElement(child));
  }

  return {
    tagName: node.tagName.toLowerCase(),
    attributes: normalizeAttributes(node.attributes),
    scriptPayloads,
    children,
  };
}

function collectSchemaPayloads(node: ElementNode): NormalizedSchemaPayload[] {
  const schemaPayloads: NormalizedSchemaPayload[] = [];

  for (const child of node.children) {
    if (child.kind !== "element" || child.tagName.toLowerCase() !== "script") {
      continue;
    }

    const type = getAttributeValue(child.attributes, "type")?.toLowerCase();
    const componentType = getAttributeValue(child.attributes, "data-schema")?.toLowerCase();
    if (type !== "application/json" || !componentType) {
      continue;
    }

    schemaPayloads.push({
      componentType,
      content: child.children
        .filter((grandchild): grandchild is Extract<SyntaxNode, { kind: "text" }> => grandchild.kind === "text")
        .map((grandchild) => grandchild.value)
        .join(""),
    });
  }

  return schemaPayloads;
}

function normalizeAttributes(attributes: AttributeNode[]): NormalizedAttribute[] {
  const seen = new Set<string>();
  const normalized: NormalizedAttribute[] = [];

  for (const attribute of attributes) {
    const normalizedName = normalizeAttributeName(attribute.name);
    if (seen.has(normalizedName)) {
      continue;
    }
    seen.add(normalizedName);
    normalized.push({
      originalName: attribute.name,
      normalizedName,
      value: attribute.value,
      boolean: attribute.boolean,
    });
  }

  return normalized;
}

function getAttributeValue(attributes: AttributeNode[], name: string): string | undefined {
  const attribute = attributes.find((candidate) => candidate.name.toLowerCase() === name);
  return attribute?.value;
}

export function normalizeAttributeName(name: string): string {
  if (name.includes(".")) {
    return name
      .split(".")
      .map((part, index) => {
        const lowered = part.toLowerCase();
        return index === 0 ? normalizeSegment(lowered) : normalizeSegment(lowered, true);
      })
      .join(".");
  }

  return normalizeSegment(name.toLowerCase());
}

function normalizeSegment(segment: string, preserveLowercase = false): string {
  const leadingDash = segment.startsWith("-");
  const body = leadingDash ? segment.slice(1) : segment;
  const parts = body.split("-").filter(Boolean);

  const firstPart = parts[0];
  if (!firstPart) {
    return leadingDash ? "" : segment;
  }

  const first = leadingDash ? capitalize(firstPart) : preserveLowercase ? firstPart : firstPart;
  const rest = parts.slice(1).map(capitalize).join("");
  return `${first}${rest}`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
