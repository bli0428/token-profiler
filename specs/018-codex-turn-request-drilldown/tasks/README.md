# Task Workstreams: Codex Turn Request Drilldown

The implementation is intentionally split into four task documents so work stays isolated by module boundary:

1. [Capture and canonical turn identity](01-capture-canonical-turn-id.tasks.md)
2. [Analyzer turn hierarchy](02-analyzer-turn-hierarchy.tasks.md)
3. [Dashboard API turn drilldown contract](03-dashboard-api-contract.tasks.md)
4. [Dashboard surface](04-dashboard-surface.tasks.md)

## Dependency Order

```text
Capture/canonical -> Analyzer -> Dashboard API -> Dashboard surface
```

Each task file has its own tests, implementation tasks, validation commands, and checkpoint. The boundary rule is the point: do not move analyzer derivation into capture, do not move API shaping into React, do not parse provider-specific Codex payloads outside the adapter, and do not keep a parallel request-first dashboard contract solely for compatibility.

Task IDs are scoped to each task file so a workstream can be implemented independently without renumbering unrelated module work.

## Suggested Execution

- Start with `01-capture-canonical-turn-id.tasks.md` to get clean first-class turn facts into new JSONL.
- Continue with `02-analyzer-turn-hierarchy.tasks.md` to derive the hierarchy and titles.
- Continue with `03-dashboard-api-contract.tasks.md` to expose the view model.
- Finish with `04-dashboard-surface.tasks.md` to render the hierarchy.

## Validation Rollup

After all four workstreams pass their local checkpoints, run:

```bash
npm run typecheck
npm test
cd dashboard
npm run typecheck
npm test
```
