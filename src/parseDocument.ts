import { parseDocumentTree } from "./document/normalize";
import { parseHtmlToAst } from "./syntax/parser";

export function parseDocument(input: string) {
  return parseDocumentTree(parseHtmlToAst(input));
}
