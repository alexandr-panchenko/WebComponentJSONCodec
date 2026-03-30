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

export interface NormalizedDocument {
  roots: NormalizedElement[];
}

export function parseDocumentTree(document: DocumentNode): NormalizedDocument {
  return {
    roots: document.roots.flatMap(normalizeRootNode),
  };
}

function normalizeRootNode(node: SyntaxNode): NormalizedElement[] {
  if (node.kind === "comment") {
    return [];
  }
  if (node.kind === "text") {
    return node.value.trim() === "" ? [] : [];
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
