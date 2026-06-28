<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
at specs/014-request-accounting-contract/plan.md
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

## Coding Style

Prefer boring and explicit code at module boundaries.

When data crosses a module, layer, or public contract boundary, define owned
types and map fields explicitly by name. Avoid broad structural typing, object
spreading, or reused internal view-model types when they would make contracts
change implicitly.

Duplication is acceptable when it preserves contract ownership, privacy, or
layer separation.
