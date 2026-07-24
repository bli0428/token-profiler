# Analysis

The analysis layer derives reusable facts from canonical records.

Use this layer for exposure, attribution, grouping, legibility, replay, and
other computed results that should be shared by surfaces.

`src/analysis/index.ts` exports the large-run projection APIs for consumers
that need request-level totals without retaining the run's artifact history.

For boundary rules and allowed inputs/outputs, see [contract.md](contract.md).
