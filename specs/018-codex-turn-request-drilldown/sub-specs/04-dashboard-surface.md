# Sub-Spec: Dashboard Surface

## Domain Boundary

This sub-spec covers frontend rendering and interaction for the turn/request/artifact drilldown.

**Owns**
- Presenting turns as the top run-detail grouping.
- Expanding turns into request rows.
- Expanding requests into artifact detail views.
- Keeping labels, empty states, and fallbacks understandable.

**Does Not Own**
- Building turn groups from canonical records.
- Parsing provider payloads.
- Selecting titles from raw artifacts outside API-provided fields.

## Required Behavior

- The run detail presents turns as the first drilldown layer.
- Turn rows are titled by API-provided turn title.
- Request rows are titled by API-provided request title.
- Artifact expansion continues to use existing artifact detail rendering.
- Rows with fallback or missing turn identity remain visible and clearly labeled.
- Existing storage/capture mode visibility remains top-level and passive.

## Interaction Expectations

- Users can expand/collapse a turn without losing session selection.
- Users can expand/collapse a request to inspect artifacts.
- Existing artifact selection behavior remains stable when nested under requests.
- Dense dashboard layout should remain scannable for sessions with many turns and requests.

## Anti-Requirements

- Do not parse `artifact_id` naming conventions to infer turn titles.
- Do not inspect raw Codex metadata in browser code.
- Do not use proxy ids as primary titles when richer API titles are present.
- Do not hide ungrouped requests just because they lack turn identity.

## Acceptance Checks

- A user can distinguish separate turns in one session by turn title.
- A user can distinguish multiple requests inside one turn by assistant-preview request title.
- A user can reach the same artifact details currently available in request expansion.
- Missing-title and missing-turn states read as limitations, not as broken UI.
