<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
at specs/018-codex-turn-request-drilldown/plan.md
<!-- SPECKIT END -->

## Architecture Direction

Read [docs/architecture.md](/Users/brandonli/Documents/TokenEfficiencyTracker/docs/architecture.md)
before adding capture, analyzer, storage, or surface code.

The project follows:

```text
Adapters -> Canonical Store -> Analyzers -> Surfaces
```

Provider-specific payloads stop at adapters. Analyzers consume canonical records
only. The module-boundary refactor in
[specs/006-module-boundaries-architecture](/Users/brandonli/Documents/TokenEfficiencyTracker/specs/006-module-boundaries-architecture/spec.md)
should happen before substantial new adapter, analyzer, or dashboard work.

## Layer Documentation

Each major layer or package should have two human-facing docs:

- `README.md` for what the layer is and how to use it.
- `contract.md` for API reference documentation: the public classes,
  functions, types, import paths, return shapes, invariants, and forbidden
  dependencies that external modules may rely on.

If a change affects a layer's ownership, exports, inputs, outputs, privacy
rules, or allowed dependencies, update both docs or confirm that the
unaffected doc still accurately reflects the boundary.

Treat the contract doc as the source of truth for the layer's supported public
surface and the README as the usage-oriented companion. Keep them current
together so an agent can read both and understand how to integrate with the
layer safely. Avoid duplication of internal implementation detail.

## Coding Style

Prefer boring and explicit code at module boundaries.

When data crosses a module, layer, or public contract boundary, define owned
types and map fields explicitly by name. Avoid broad structural typing, object
spreading, or reused internal view-model types when they would make contracts
change implicitly.

Duplication is acceptable when it preserves contract ownership, privacy, or
layer separation.
