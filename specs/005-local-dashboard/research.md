# Research: Local Metrics Dashboard

## Decision: Start with static local dashboard generation

**Rationale**: The existing `html` command already writes a local report from analyzer results. Extending this path keeps the first dashboard read-only, local-first, easy to validate in tests, and useful without introducing a long-running server lifecycle.

**Alternatives considered**:

- Local web server first: better for live refresh and multi-session navigation, but adds process lifecycle, port, and stale-server behavior before the core dashboard model is proven.
- Full Vite/React dashboard first: richer app ergonomics, but would add dependencies and build complexity before the project has a stable dashboard data contract.

## Decision: Create a typed dashboard view model between analyzers and HTML

**Rationale**: The dashboard needs stable contracts for overview cards, artifact rows, details, task groups, filters, privacy state, and caveats. A view model lets tests verify behavior without brittle HTML assertions and keeps browser JavaScript from recomputing analysis.

**Alternatives considered**:

- Render directly from `RunAnalysisSummary`: fastest short term, but couples HTML layout to analyzer internals and makes privacy/search filtering easier to get wrong.
- Compute metrics in browser JavaScript: interactive, but violates architecture boundaries and risks embedding hidden raw content in client state.

## Decision: Keep dashboard code under the Surfaces layer

**Rationale**: Dashboard modules format and navigate analyzer outputs. They should not own canonical schemas, provider adapters, tokenization, exposure, cache attribution, legibility, or task grouping logic.

**Alternatives considered**:

- Add dashboard logic to `src/analysis/`: rejected because filtering and rendering are presentation concerns.
- Add dashboard logic to CLI command handlers: rejected because command handlers would become too broad and hard to test.

## Decision: Sanitize display/search payloads before rendering

**Rationale**: Static reports embed data into HTML. If hidden raw content enters embedded JSON or attributes, CSS/JS visibility controls are not enough. The dashboard view model should contain only content that the selected privacy mode permits displaying or searching.

**Alternatives considered**:

- Hide restricted DOM sections with CSS: rejected because hidden content would still be present in the page source.
- Trust analyzer output without surface guardrails: rejected because the dashboard is a new, richer display surface and should provide a second privacy boundary.

## Decision: Session browsing uses local run-directory summaries

**Rationale**: Recent sessions already live under the local data directory. A session index can summarize run ID, timestamp, request count, artifact count, and headline metrics without adding storage. Optional richer labels can stay in CLI/session orchestration where existing Codex metadata enrichment already lives.

**Alternatives considered**:

- Persist a separate dashboard index: faster for many runs, but introduces migration and stale index behavior.
- Require the user to pass a run directory every time: simpler, but does not satisfy session selection requirements.

## Decision: Use existing node tests for the first validation layer

**Rationale**: View-model generation, HTML rendering, privacy filtering, and session indexing can be validated with `node:test` and fixtures using existing project tooling. Browser-level checks can be added later if the implementation introduces behavior that static assertions cannot cover.

**Alternatives considered**:

- Add Playwright immediately: useful for interaction confidence, but adds a new dev dependency and browser install workflow. Use it only if implementation reaches complexity where DOM-level interaction tests become necessary.
