# Codex Turn Request Drilldown

This feature introduces a clean first-class Codex turn key and uses it to present run detail as:

```text
turns -> requests -> artifacts
```

## Documents

- [spec.md](spec.md): user-facing feature specification.
- [sub-specs/01-capture-canonical-turn-id.md](sub-specs/01-capture-canonical-turn-id.md): adapter/canonical storage boundary.
- [sub-specs/02-analyzer-turn-hierarchy.md](sub-specs/02-analyzer-turn-hierarchy.md): analyzer-owned hierarchy and title selection.
- [sub-specs/03-dashboard-api-contract.md](sub-specs/03-dashboard-api-contract.md): dashboard API view-model boundary.
- [sub-specs/04-dashboard-surface.md](sub-specs/04-dashboard-surface.md): frontend rendering boundary.
- [contracts/canonical-turn-facts.md](contracts/canonical-turn-facts.md): canonical turn fact contract sketch.
- [contracts/turn-drilldown-dashboard.md](contracts/turn-drilldown-dashboard.md): dashboard run-detail contract sketch.
- [tasks/](tasks/): separate implementation task lists for each module boundary.

## Architecture Rule

The feature follows:

```text
Adapters -> Canonical Store -> Analyzers -> Surfaces
```

Provider-specific Codex metadata stops at the adapter. The dashboard renders API-provided turn and request rows.
