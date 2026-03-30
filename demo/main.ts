import {
  createSchemaRegistry,
  defineComponentSchema,
  deserializeHtml,
  serializeJson,
} from "../src/index";

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

const initialHtml = `<board-card title="Roadmap" position.x="10" position.y="20" tags="alpha,beta">
  <script type="application/json" data-property="data">
    { "points": [[1, 2], [3, 4]] }
  </script>
  <board-note text="Ship parser"></board-note>
</board-card>`;

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
    const result = deserializeHtml(elements.htmlInput.value, registry);
    elements.jsonOutput.textContent = JSON.stringify(result, null, 2);
    elements.htmlOutput.textContent = serializeJson(result, registry);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    elements.jsonOutput.textContent = `Error: ${message}`;
    elements.htmlOutput.textContent = "";
  }
}

elements.rerunButton.addEventListener("click", render);
elements.htmlInput.addEventListener("input", render);
render();
