<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
at specs/007-dashboard-api-surface/plan.md
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
