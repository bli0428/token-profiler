# Analysis

The analysis layer derives reusable facts from canonical records.

Use this layer for exposure, attribution, grouping, legibility, replay, and
other computed results that should be shared by surfaces.

`src/analysis/index.ts` exports the large-run projection APIs for consumers
that need request-level totals without retaining the run's artifact history.
Each projection row contains only canonical request identity, latest timestamp,
provider-usage facts, observed turn identity, and aggregate artifact counts;
surfaces own pagination cursors and HTTP response mapping.

For boundary rules and allowed inputs/outputs, see [contract.md](contract.md).
