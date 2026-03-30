import type { AttributeNode, DocumentNode, ElementNode, SyntaxNode } from "../types";
import { decodeHtmlEntities } from "../utils/html";
import {
  advance,
  consumeWhile,
  createTokenizer,
  eof,
  peek,
  skipWhitespace,
  type TokenizerState,
} from "./tokenizer";

const RAW_TEXT_TAGS = new Set(["script"]);

export function parseHtmlToAst(input: string): DocumentNode {
  const state = createTokenizer(input);
  const roots = parseChildren(state, undefined);
  return { roots };
}

function parseChildren(state: TokenizerState, closingTag: string | undefined): SyntaxNode[] {
  const nodes: SyntaxNode[] = [];

  while (!eof(state)) {
    if (closingTag && state.input.startsWith(`</${closingTag}`, state.index)) {
      parseClosingTag(state, closingTag);
      return nodes;
    }

    if (state.input.startsWith("<!--", state.index)) {
      nodes.push(parseComment(state));
      continue;
    }

    if (peek(state) === "<") {
      if (peek(state, 1) === "/") {
        throw new Error(`Unexpected closing tag near index ${state.index}`);
      }
      nodes.push(parseElement(state));
      continue;
    }

    nodes.push(parseText(state));
  }

  if (closingTag) {
    throw new Error(`Missing closing tag </${closingTag}>`);
  }

  return nodes;
}

function parseComment(state: TokenizerState): SyntaxNode {
  advance(state, 4);
  const end = state.input.indexOf("-->", state.index);
  if (end === -1) {
    throw new Error("Unterminated comment");
  }
  const value = state.input.slice(state.index, end);
  state.index = end + 3;
  return { kind: "comment", value };
}

function parseText(state: TokenizerState): SyntaxNode {
  const value = consumeWhile(state, (char) => char !== "<");
  return { kind: "text", value: decodeHtmlEntities(value) };
}

function parseElement(state: TokenizerState): ElementNode {
  expect(state, "<");
  const tagName = readTagName(state);
  if (!tagName) {
    throw new Error(`Expected tag name near index ${state.index}`);
  }

  const attributes: AttributeNode[] = [];

  while (!eof(state)) {
    skipWhitespace(state);

    if (state.input.startsWith("/>", state.index)) {
      advance(state, 2);
      return {
        kind: "element",
        tagName,
        attributes,
        children: [],
      };
    }

    if (peek(state) === ">") {
      advance(state);
      if (RAW_TEXT_TAGS.has(tagName.toLowerCase())) {
        return {
          kind: "element",
          tagName,
          attributes,
          children: parseRawTextChildren(state, tagName),
        };
      }
      return {
        kind: "element",
        tagName,
        attributes,
        children: parseChildren(state, tagName),
      };
    }

    attributes.push(parseAttribute(state));
  }

  throw new Error(`Unterminated start tag <${tagName}>`);
}

function parseRawTextChildren(state: TokenizerState, tagName: string): SyntaxNode[] {
  const needle = `</${tagName}`;
  const end = state.input.toLowerCase().indexOf(needle.toLowerCase(), state.index);
  if (end === -1) {
    throw new Error(`Missing closing tag </${tagName}>`);
  }
  const text = state.input.slice(state.index, end);
  state.index = end;
  const children: SyntaxNode[] = text.length > 0 ? [{ kind: "text", value: text }] : [];
  parseClosingTag(state, tagName);
  return children;
}

function parseClosingTag(state: TokenizerState, tagName: string): void {
  expect(state, "</");
  skipWhitespace(state);
  const actual = readTagName(state);
  skipWhitespace(state);
  expect(state, ">");

  if (actual.toLowerCase() !== tagName.toLowerCase()) {
    throw new Error(`Mismatched closing tag </${actual}> for <${tagName}>`);
  }
}

function parseAttribute(state: TokenizerState): AttributeNode {
  const name = readAttributeName(state);
  if (!name) {
    throw new Error(`Expected attribute name near index ${state.index}`);
  }

  skipWhitespace(state);
  if (peek(state) !== "=") {
    return { name, value: "", quote: null, boolean: true };
  }

  advance(state);
  skipWhitespace(state);
  const quote = peek(state);
  if (quote !== '"' && quote !== "'") {
    throw new Error(`Attribute ${name} must use quotes`);
  }
  advance(state);
  const value = consumeWhile(state, (char) => char !== quote);
  expect(state, quote);
  return {
    name,
    value: decodeHtmlEntities(value),
    quote,
    boolean: false,
  };
}

function readTagName(state: TokenizerState): string {
  return consumeWhile(state, (char) => /[A-Za-z0-9:_-]/.test(char));
}

function readAttributeName(state: TokenizerState): string {
  return consumeWhile(state, (char) => /[A-Za-z0-9:._-]/.test(char));
}

function expect(state: TokenizerState, value: string): void {
  if (!state.input.startsWith(value, state.index)) {
    throw new Error(`Expected "${value}" near index ${state.index}`);
  }
  advance(state, value.length);
}
