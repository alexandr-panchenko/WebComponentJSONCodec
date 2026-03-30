# PLAN

## Complete

- Fresh Bun + TypeScript repository scaffold.
- Portable hand-written HTML subset parser.
- Document normalization layer.
- Schema-aware HTML → JSON deserialization.
- Deterministic JSON → HTML serialization baseline.
- Behavior-first Bun tests derived from the old prototype scenarios.
- Round-trip coverage for constrained documents.
- Minimal browser demo scaffold.
- GitHub Actions CI scaffold.

## Partial

- Serialization policy is intentionally simple and canonical.
  - Primitive and primitive-array values serialize to attributes.
  - Complex values serialize to a JSON script block.
  - Future work may split large payloads into targeted `data-property` scripts during serialization.
- Entity support is intentionally small.
  - Named entities currently cover common XML/HTML-safe cases used in board documents.

## Remaining

- Broader negative tests for malformed markup.
- More serializer coverage for unknown extra properties and mixed schema/unschematized payloads.
- Optional packaging polish for publishing (`files`, versioning, release flow).
- Optional grammar notes / EBNF document.

## Deferred

- YAML support.
- Full HTML error recovery.
- Browser-accurate parsing behavior.
- Preserving source formatting.
- Custom Gherkin execution.

## Open Questions

- Whether serialization should emit multiple targeted script tags when several complex nested properties exist.
- Whether future document versions should preserve non-whitespace text nodes outside known component semantics.
- Whether schema definitions should eventually support required-vs-optional metadata distinct from defaults.

## Chosen Clarifications

- Duplicate attributes that normalize to the same property use first-wins semantics.
- Invalid JSON inside supported script tags is ignored rather than failing the whole document.
- Unknown component types are preserved as generic component nodes.
