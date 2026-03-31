import { describe, expect, test } from "bun:test";
import { createSchemaRegistry, deserializeHtml } from "../../src/index";
import { schemaFromTable } from "./helpers";

describe("deserializeHtml", () => {
  test("handles attribute case normalization and JSON script precedence", () => {
    const registry = createSchemaRegistry([
      schemaFromTable("case-test", [
        { Property: "lowercase", Type: "string", Default: '""' },
        { Property: "camelCase", Type: "string", Default: '""' },
        { Property: "camelcase", Type: "string", Default: '""' },
        { Property: "kebabCase", Type: "string", Default: '""' },
        { Property: "mixedCase", Type: "string", Default: '""' },
        { Property: "DashPrefix", Type: "string", Default: '""' },
        { Property: "PascalCase", Type: "string", Default: '""' },
      ]),
    ]);

    const html = `
      <case-test
        lowercase="Stays lowercase"
        LOWERCASE="Becomes lowercase"
        Lowercase="Becomes lowercase"
        camelCase="Becomes camelcase"
        camelcase="Stays camelcase"
        kebab-case="Becomes kebabCase (camelCase)"
        KEBAB-CASE="Becomes kebabCase"
        Mixed-Case="Becomes mixedCase"
        -dash-prefix="Becomes DashPrefix (PascalCase)"
      >
        <script type="application/json">
          {
            "camelCase": "Set from JSON",
            "PascalCase": "Preserved from JSON"
          }
        </script>
      </case-test>
    `;

    expect(deserializeHtml(html, registry)).toMatchObject({
      type: "case-test",
      properties: {
        lowercase: "Stays lowercase",
        camelcase: "Becomes camelcase",
        camelCase: "Set from JSON",
        kebabCase: "Becomes kebabCase (camelCase)",
        mixedCase: "Becomes mixedCase",
        DashPrefix: "Becomes DashPrefix (PascalCase)",
        PascalCase: "Preserved from JSON",
      },
    });
  });

  test("coerces primitives and boolean attributes", () => {
    const registry = createSchemaRegistry([
      schemaFromTable("test-component", [
        { Property: "title", Type: "string", Default: '"Default Title"' },
        { Property: "count", Type: "number", Default: "0" },
        { Property: "isactive", Type: "boolean", Default: "false" },
      ]),
    ]);

    expect(
      deserializeHtml(
        `<test-component title="Test Title" count="42" isActive></test-component>`,
        registry,
      ),
    ).toMatchObject({
      type: "test-component",
      properties: {
        title: "Test Title",
        count: 42,
        isactive: true,
      },
      children: [],
    });
  });

  test("applies defaults for missing and invalid values", () => {
    const registry = createSchemaRegistry([
      schemaFromTable("test-component", [
        { Property: "title", Type: "string", Default: '"Title"' },
        { Property: "count", Type: "number", Default: "0" },
        { Property: "isactive", Type: "boolean", Default: "false" },
      ]),
    ]);

    expect(
      deserializeHtml(`<test-component title="Valid" count="not-a-number"></test-component>`, registry),
    ).toMatchObject({
      properties: {
        title: "Valid",
        count: 0,
        isactive: false,
      },
    });
  });

  test("supports dot notation defaults and coercion", () => {
    const registry = createSchemaRegistry([
      schemaFromTable("nested-component", [
        { Property: "name", Type: "string", Default: '""' },
        { Property: "position.x", Type: "number", Default: "0" },
        { Property: "position.y", Type: "number", Default: "0" },
        { Property: "dimensions.width", Type: "number", Default: "100" },
        { Property: "dimensions.height", Type: "number", Default: "100" },
      ]),
    ]);

    expect(
      deserializeHtml(
        `<nested-component name="Partial" position.x="100" dimensions.width="300"></nested-component>`,
        registry,
      ),
    ).toMatchObject({
      properties: {
        name: "Partial",
        position: { x: 100, y: 0 },
        dimensions: { width: 300, height: 100 },
      },
    });
  });

  test("coerces arrays of primitives", () => {
    const registry = createSchemaRegistry([
      schemaFromTable("array-component", [
        { Property: "items", Type: "string[]", Default: "[]" },
        { Property: "values", Type: "number[]", Default: "[]" },
        { Property: "flags", Type: "boolean[]", Default: "[]" },
      ]),
    ]);

    expect(
      deserializeHtml(
        `<array-component items="one,two,three" values="1,2,3" flags="true,false,true"></array-component>`,
        registry,
      ),
    ).toMatchObject({
      properties: {
        items: ["one", "two", "three"],
        values: [1, 2, 3],
        flags: [true, false, true],
      },
    });
  });

  test("deserializes nested children and ignores comments", () => {
    const registry = createSchemaRegistry([
      schemaFromTable("parent-component", [
        { Property: "title", Type: "string", Default: '""' },
      ]),
      schemaFromTable("child-component", [
        { Property: "name", Type: "string", Default: '""' },
        { Property: "value", Type: "number", Default: "0" },
      ]),
    ]);

    expect(
      deserializeHtml(
        `
          <!-- comment -->
          <parent-component title="Parent Title">
            <child-component name="Child 1" value="10"></child-component>
            <child-component name="Child 2" value="20"></child-component>
          </parent-component>
          <!-- trailing -->
        `,
        registry,
      ),
    ).toMatchObject({
      type: "parent-component",
      properties: { title: "Parent Title" },
      children: [
        { type: "child-component", properties: { name: "Child 1", value: 10 }, children: [] },
        { type: "child-component", properties: { name: "Child 2", value: 20 }, children: [] },
      ],
    });
  });

  test("merges JSON script blocks and ignores invalid JSON", () => {
    const registry = createSchemaRegistry([
      schemaFromTable("complex-component", [
        { Property: "title", Type: "string", Default: '""' },
        { Property: "points", Type: "number[][]", Default: "[]" },
        { Property: "metadata.author", Type: "string", Default: '"Unknown"' },
        { Property: "metadata.version", Type: "number", Default: "1" },
      ]),
    ]);

    expect(
      deserializeHtml(
        `
          <complex-component title="Complex Data Example">
            <script type="application/json">
              {
                "points": [[0, 0], [100, 100]],
                "metadata": {
                  "author": "Test User",
                  "version": 2.1
                }
              }
            </script>
            <script type="application/json">{ invalid json }</script>
          </complex-component>
        `,
        registry,
      ),
    ).toMatchObject({
      properties: {
        title: "Complex Data Example",
        points: [[0, 0], [100, 100]],
        metadata: { author: "Test User", version: 2.1 },
      },
    });
  });

  test("supports data-property targeted JSON blocks", () => {
    const registry = createSchemaRegistry([
      schemaFromTable("multi-script-component", [
        { Property: "title", Type: "string", Default: '""' },
        { Property: "data.items", Type: "string[]", Default: "[]" },
        { Property: "config.theme", Type: "string", Default: '"light"' },
        { Property: "config.showControls", Type: "boolean", Default: "false" },
      ]),
    ]);

    expect(
      deserializeHtml(
        `
          <multi-script-component title="Multiple Scripts">
            <script type="application/json" data-property="data">
              { "items": ["one", "two", "three"] }
            </script>
            <script type="application/json" data-property="config">
              { "theme": "dark", "showControls": true }
            </script>
          </multi-script-component>
        `,
        registry,
      ),
    ).toMatchObject({
      properties: {
        title: "Multiple Scripts",
        data: { items: ["one", "two", "three"] },
        config: { theme: "dark", showControls: true },
      },
    });
  });

  test("preserves unknown components and extra properties", () => {
    expect(
      deserializeHtml(
        `<unknown-component custom-prop="value" data-test="test" enabled></unknown-component>`,
      ),
    ).toMatchObject({
      type: "unknown-component",
      properties: {
        customProp: "value",
        dataTest: "test",
        enabled: true,
      },
      children: [],
    });
  });

  test("supports multiple roots when requested", () => {
    const registry = createSchemaRegistry([
      schemaFromTable("test-component", [
        { Property: "title", Type: "string", Default: '"Title"' },
      ]),
    ]);

    expect(
      deserializeHtml(
        `<test-component title="First"></test-component><test-component title="Second"></test-component>`,
        registry,
        { multipleRoots: true },
      ),
    ).toMatchObject([
      { type: "test-component", properties: { title: "First" }, children: [] },
      { type: "test-component", properties: { title: "Second" }, children: [] },
    ]);
  });

  test("accepts full HTML documents and embedded head schemas", () => {
    expect(
      deserializeHtml(
        `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Board</title>
              <script type="application/json" data-schema="board-card">
                {
                  "title": { "type": "string", "default": "" },
                  "position.x": { "type": "number", "default": 0 },
                  "position.y": { "type": "number", "default": 0 },
                  "tags": { "type": "string[]", "default": [] }
                }
              </script>
              <script type="application/json" data-schema="board-note">
                {
                  "text": { "type": "string", "default": "" }
                }
              </script>
            </head>
            <body>
              <board-card title="Roadmap" position.x="10" position.y="20" tags="alpha,beta"></board-card>
              <board-note text="Ship demo"></board-note>
            </body>
          </html>
        `,
        {},
        { multipleRoots: true },
      ),
    ).toMatchObject([
      {
        type: "board-card",
        properties: {
          title: "Roadmap",
          position: { x: 10, y: 20 },
          tags: ["alpha", "beta"],
        },
        children: [],
      },
      {
        type: "board-note",
        properties: { text: "Ship demo" },
        children: [],
      },
    ]);
  });

  test("decodes supported HTML entities in attribute values", () => {
    const registry = createSchemaRegistry([
      schemaFromTable("test-component", [
        { Property: "title", Type: "string", Default: '"Title"' },
      ]),
    ]);

    expect(
      deserializeHtml(
        `<test-component title="Title with &quot;quotes&quot; and &amp;"></test-component>`,
        registry,
      ),
    ).toMatchObject({
      properties: {
        title: `Title with "quotes" and &`,
      },
    });
  });
});
