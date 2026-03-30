# AGENTS.md

## Purpose

This repository is a portable systems-style library for a constrained whiteboard document format that happens to use HTML syntax.

It is not a browser widget, not a DOM wrapper, and not a general-purpose HTML parser.

## Architecture

Code is intentionally split into layers:

- `src/syntax`
  - Hand-written tokenizer/parser.
  - Knows only the constrained HTML syntax.
  - Must stay free of schema logic and document mapping rules.
- `src/document`
  - Converts the raw AST into normalized document nodes.
  - Handles comment dropping, script extraction, and attribute-name normalization.
- `src/mapping`
  - Applies schema-aware defaults, coercion, path handling, and script JSON merging.
  - Creates `ComponentNode` JSON output.
- `src/serialization`
  - Serializes `ComponentNode` trees back into canonical constrained HTML.
- `src/schema`
  - Lightweight schema-definition helpers and registry creation.
- `src/utils`
  - Shared helpers only. Keep them small and generic.

## Coding Conventions

- Prefer explicit, plain TypeScript over abstraction-heavy helpers.
- Keep parsing deterministic and easy to trace.
- Add new behavior at the correct layer instead of threading special cases everywhere.
- Avoid hidden precedence rules; document them in code or tests.
- Keep runtime dependencies minimal.
- Preserve portability: no DOM APIs, no Node-only parser packages, no browser globals in core logic.

## Where to Change Things

To add new syntax:

- Update `src/syntax/parser.ts` first.
- Add or adjust document normalization in `src/document/normalize.ts` if the syntax affects normalized output.

To add new mapping rules:

- Update `src/mapping/deserialize.ts`.
- Add behavior-first tests before changing internals.

To add new serialization rules:

- Update `src/serialization/serialize.ts`.
- Keep output canonical and deterministic.

To add new schema types:

- Extend `SchemaType` in `src/types.ts`.
- Implement coercion in `src/mapping/deserialize.ts`.
- Decide how the new type serializes in `src/serialization/serialize.ts`.

## What Not To Break

- Portability across browser, Node.js, Bun, Workers, and non-DOM runtimes.
- Deterministic parse and serialization behavior.
- Script JSON handling for `type="application/json"` only.
- Comment ignoring during mapping.
- Multiple-root handling.
- Default application when typed values are invalid or missing.
- Readable canonical output.
- The explicit non-goal: no YAML support.

## Tests

Tests are behavior-first and live in `test/spec`.

- Prefer readable input/output scenarios.
- Avoid tests that target private helpers unless a tricky edge case cannot be covered at the public API.
- When behavior is ambiguous, add a test and document the chosen rule.
- Serializer changes should usually include a round-trip test.

## Portability Constraints

Do not introduce:

- `window`, `document`, `HTMLElement`, `Node`, `DOMParser`
- `jsdom`, `parse5`, or other environment-tied parsing dependencies
- Node-only filesystem or process assumptions in core library code

Demo and CI files can be environment-specific. Core library files cannot.
