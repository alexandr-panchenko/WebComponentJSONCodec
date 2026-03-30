# WebComponentJSONCodec

`WebComponentJSONCodec` is a portable TypeScript library for a strict whiteboard document format that uses HTML syntax as a human-reviewable transport layer.

It parses a constrained HTML dialect into a syntax tree, maps that tree into JSON component objects with schema-aware coercion/defaults, and serializes JSON back into canonical HTML.

## Why this exists

This repository is for board documents, not browser widgets.

The goal is deterministic document interchange across:

- browser
- Node.js
- Bun
- Cloudflare Workers
- other JavaScript runtimes without DOM APIs

The core library does not use `DOMParser`, `document`, `jsdom`, or Node-only HTML parsing packages.

## Format Philosophy

- Strict over browser-compatible recovery.
- Deterministic over permissive.
- Readable for humans and coding agents.
- Portable across runtimes with no DOM requirement.
- Focused on a constrained board-document dialect, not general HTML.

Unsupported or malformed input may be rejected. YAML is intentionally out of scope.

## Current Scope

Implemented baseline support includes:

- elements, nested elements, and multiple roots
- quoted attributes and boolean attributes
- comments in the syntax layer, ignored in mapping
- raw-text `<script type="application/json">` blocks
- schema-aware defaults and primitive coercion
- dot-path property mapping
- primitive array coercion from attributes
- deterministic canonical serialization
- unknown component preservation

Current limitations:

- no browser-style error recovery
- no YAML or alternate script payload formats
- only a constrained HTML subset is recognized
- serializer canonicalizes output instead of preserving original formatting
- duplicate attributes that normalize to the same property use a deterministic first-wins rule

## Example: HTML to JSON

```html
<board-card title="Roadmap" position.x="10" position.y="20" tags="alpha,beta">
  <script type="application/json" data-property="data">
    { "points": [[1, 2], [3, 4]] }
  </script>
  <board-note text="child"></board-note>
</board-card>
```

```ts
import {
  createSchemaRegistry,
  defineComponentSchema,
  deserializeHtml,
} from "web-component-json-codec";

const registry = createSchemaRegistry([
  defineComponentSchema("board-card", [
    { property: "title", type: "string", default: "" },
    { property: "position.x", type: "number", default: 0 },
    { property: "position.y", type: "number", default: 0 },
    { property: "tags", type: "string[]", default: [] },
    { property: "data.points", type: "number[][]", default: [] },
  ]),
  defineComponentSchema("board-note", [
    { property: "text", type: "string", default: "" },
  ]),
]);

const component = deserializeHtml(html, registry);
```

```json
{
  "type": "board-card",
  "properties": {
    "title": "Roadmap",
    "position": { "x": 10, "y": 20 },
    "tags": ["alpha", "beta"],
    "data": {
      "points": [[1, 2], [3, 4]]
    }
  },
  "children": [
    {
      "type": "board-note",
      "properties": { "text": "child" },
      "children": []
    }
  ]
}
```

## Example: JSON to HTML

```ts
import { serializeJson } from "web-component-json-codec";

const html = serializeJson({
  type: "complex-component",
  properties: {
    title: "Complex",
    points: [[0, 0], [10, 20]],
    metadata: { author: "Ada", version: 2 }
  },
  children: []
});
```

```html
<complex-component title="Complex">
  <script type="application/json">
    {
      "metadata": {
        "author": "Ada",
        "version": 2
      },
      "points": [
        [0, 0],
        [10, 20]
      ]
    }
  </script>
</complex-component>
```

## Public API

- `parseHtmlToAst(input)`
- `parseDocument(input)`
- `deserializeHtml(input, schemaRegistry, options?)`
- `serializeJson(nodeOrNodes, schemaRegistry?, options?)`
- `defineComponentSchema(type, properties)`
- `createSchemaRegistry(schemas)`

## Running the project

Install:

```bash
bun install
```

Run tests:

```bash
bun test
```

Run typecheck:

```bash
bun run typecheck
```

Build the library:

```bash
bun run build
```

Build the demo:

```bash
bun run build:demo
```

## Demo / Playground

The repo includes a tiny browser demo in [`demo`](./demo) that shows example HTML beside the deserialized JSON and the canonical serialized output.

After building:

```bash
bun run build:demo
```

Open `demo/dist/index.html` in a browser or serve the folder with any static file server.
