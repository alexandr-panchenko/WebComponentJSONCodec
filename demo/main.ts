import {
  createSchemaRegistry,
  deserializeHtml,
  defineComponentSchema,
  serializeDocumentHtml,
} from "../src/index";

const demoRegistry = createSchemaRegistry([
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

const initialHtml = `<!DOCTYPE html>
<html>
  <head>
    <title>Board Demo</title>
    <script type="application/json" data-schema="board-card">
      {
        "title": { "type": "string", "default": "" },
        "position.x": { "type": "number", "default": 0 },
        "position.y": { "type": "number", "default": 0 },
        "tags": { "type": "string[]", "default": [] },
        "data.points": { "type": "number[][]", "default": [] }
      }
    </script>
    <script type="application/json" data-schema="board-note">
      {
        "text": { "type": "string", "default": "" }
      }
    </script>
  </head>
  <body>
    <board-card title="Roadmap" position.x="10" position.y="20" tags="alpha,beta">
      <script type="application/json" data-property="data">
        { "points": [[1, 2], [3, 4]] }
      </script>
      <board-note text="Ship parser"></board-note>
    </board-card>
    <board-note text="Refine serializer"></board-note>
  </body>
</html>`;

const htmlInput = document.querySelector<HTMLTextAreaElement>("#htmlInput");
const jsonOutput = document.querySelector<HTMLElement>("#jsonOutput");
const htmlOutput = document.querySelector<HTMLElement>("#htmlOutput");
const rerunButton = document.querySelector<HTMLButtonElement>("#rerun");

if (!htmlInput || !jsonOutput || !htmlOutput || !rerunButton) {
  throw new Error("Demo elements not found");
}

const elements = {
  htmlInput,
  jsonOutput,
  htmlOutput,
  rerunButton,
};

elements.htmlInput.value = initialHtml;

function render() {
  try {
    const result = deserializeHtml(elements.htmlInput.value, {}, { multipleRoots: true });
    elements.jsonOutput.textContent = JSON.stringify(result, null, 2);
    elements.htmlOutput.textContent = serializeDocumentHtml(result, demoRegistry, {
      title: "Board Demo",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    elements.jsonOutput.textContent = `Error: ${message}`;
    elements.htmlOutput.textContent = "";
  }
}

elements.rerunButton.addEventListener("click", render);
elements.htmlInput.addEventListener("input", render);
render();
