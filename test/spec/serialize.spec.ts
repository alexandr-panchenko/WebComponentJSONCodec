import { describe, expect, test } from "bun:test";
import {
  createSchemaRegistry,
  deserializeHtml,
  serializeDocumentHtml,
  serializeJson,
} from "../../src/index";
import { schemaFromTable } from "./helpers";

describe("serializeJson", () => {
  test("serializes scalar properties as deterministic attributes", () => {
    const html = serializeJson({
      type: "test-component",
      properties: {
        title: "Hello",
        count: 42,
        isactive: true,
      },
      children: [],
    });

    expect(html).toBe(`<test-component count="42" isactive title="Hello"></test-component>`);
  });

  test("serializes complex values into JSON script blocks", () => {
    const html = serializeJson({
      type: "complex-component",
      properties: {
        title: "Complex",
        points: [[0, 0], [10, 20]],
        metadata: {
          author: "Ada",
          version: 2,
        },
      },
      children: [],
    });

    expect(html).toContain(`<complex-component title="Complex">`);
    expect(html).toContain(`<script type="application/json">`);
    expect(html).toContain(`"points"`);
    expect(html).toContain(`"metadata"`);
  });

  test("round-trips through deserialize and serialize for constrained documents", () => {
    const registry = createSchemaRegistry([
      schemaFromTable("board-card", [
        { Property: "title", Type: "string", Default: '""' },
        { Property: "position.x", Type: "number", Default: "0" },
        { Property: "position.y", Type: "number", Default: "0" },
        { Property: "tags", Type: "string[]", Default: "[]" },
        { Property: "data.points", Type: "number[][]", Default: "[]" },
      ]),
      schemaFromTable("board-note", [
        { Property: "text", Type: "string", Default: '""' },
      ]),
    ]);

    const original = `
      <board-card title="Roadmap" position.x="10" position.y="20" tags="alpha,beta">
        <script type="application/json" data-property="data">
          { "points": [[1, 2], [3, 4]] }
        </script>
        <board-note text="child"></board-note>
      </board-card>
    `;

    const component = deserializeHtml(original, registry);
    const serialized = serializeJson(component, registry);
    const reparsed = deserializeHtml(serialized, registry);

    expect(serialized).not.toContain(`"position"`);
    expect(serialized).not.toContain(`"tags"`);
    expect(reparsed).toEqual(component);
  });

  test("serializes full HTML documents with embedded schemas", () => {
    const registry = createSchemaRegistry([
      schemaFromTable("board-card", [
        { Property: "title", Type: "string", Default: '""' },
        { Property: "position.x", Type: "number", Default: "0" },
        { Property: "position.y", Type: "number", Default: "0" },
      ]),
      schemaFromTable("board-note", [
        { Property: "text", Type: "string", Default: '""' },
      ]),
    ]);

    const html = serializeDocumentHtml(
      [
        {
          type: "board-card",
          properties: {
            title: "Roadmap",
            position: { x: 10, y: 20 },
          },
          children: [],
        },
        {
          type: "board-note",
          properties: {
            text: "Ship parser",
          },
          children: [],
        },
      ],
      registry,
    );

    expect(html).toContain(`<!DOCTYPE html>`);
    expect(html).toContain(`<script type="application/json" data-schema="board-card">`);
    expect(html).toContain(`<body>`);
    expect(
      deserializeHtml(html, {}, { multipleRoots: true }),
    ).toMatchObject([
      {
        type: "board-card",
        properties: {
          title: "Roadmap",
          position: { x: 10, y: 20 },
        },
        children: [],
      },
      {
        type: "board-note",
        properties: { text: "Ship parser" },
        children: [],
      },
    ]);
  });
});
