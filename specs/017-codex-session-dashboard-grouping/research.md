# Research: Codex Session Dashboard Grouping

## Decision: Treat Dashboard Grouping As API Contract Rendering

**Rationale**: The dashboard is a surface. It should render session identity, confidence, source, and limitations supplied by the dashboard API rather than deriving Codex identity from provider payloads, route hints, prompt cache keys, or headers.

**Alternatives considered**:
- Parse Codex-specific metadata in React: rejected because provider-specific payloads must terminate before surfaces.
- Re-group browser rows client-side by `codex_session_id`: rejected because the API already owns the session list contract and selected run route.
- Keep showing only limitations text: rejected because users need an explicit positive label for true Codex-session rows, not just warnings for fallback rows.

## Decision: Use `run_id` As The Dashboard Selection Handle

**Rationale**: Existing dashboard navigation fetches `/api/runs/{run_id}` for the selected row. After spec 016, new Codex traffic should have API session rows whose route/run identity is already aligned to the Codex session grouping. Using the API row handle avoids inventing another browser-side identity layer.

**Alternatives considered**:
- Select by `codex_session_id`: rejected because fallback rows may not have one and because the run endpoint is keyed by the API's selected run id.
- Select by label/title: rejected because labels are not unique and may change.
- Select by prompt cache key: rejected because cache keys are provider hints, not one-to-one Codex session identity.

## Decision: Make Grouping Source Visible In The Session Row

**Rationale**: The user needs to tell at a glance whether a row is truly grouped by Codex session identity or only by fallback/cache identity. A compact badge derived from `identity.mapping_source` and `identity.mapping_confidence` satisfies that without exposing raw metadata.

**Alternatives considered**:
- Display raw `mapping_source` values directly: rejected because internal enum names are less clear than concise user-facing labels.
- Display full Codex UUID prominently: rejected because titles and row labels should stay scannable; the UUID can remain available through accessible/title text or API inspection.
- Hide fallback rows: rejected because missing identity should be visible and honest, not silently dropped.

## Decision: Validate Both API Boundaries And React Behavior

**Rationale**: The feature can fail either upstream, by merging direct sessions incorrectly, or in the UI, by obscuring the grouping source or selecting the wrong run. Root API tests should prove separate Codex-session run ids stay separate even with shared cache hints; dashboard tests should prove rows are labeled and selected by `run_id`.

**Alternatives considered**:
- Only snapshot fixture output: rejected because fixture snapshots do not directly prove selection isolation.
- Only visual/manual testing: rejected because grouping regressions are easy to miss and should be automated.
