# Research: Dashboard Shell State Architecture

## Decision 1: Defer Until Spec 008 Is Complete

**Decision**: Treat this feature as post-008 work only.

**Rationale**: Spec 008 establishes the isolated dashboard package, API client, fixtures, and first app behavior. Refactoring architecture before that baseline exists would either duplicate 008 tasks or force speculative source changes.

**Alternatives considered**:

- Merge into spec 008: rejected because 008 already carries app creation, API integration, and UI behavior.
- Start from root source: rejected because the dashboard app must remain isolated under `dashboard/`.

## Decision 2: Use Shell plus Controller Boundaries

**Decision**: Introduce `DashboardShell` for layout/status composition and `DashboardController` for route state, user actions, data orchestration, refresh lifecycle, and reconciliation.

**Rationale**: This keeps `App.tsx` small while preventing view components from owning global transitions. The controller boundary gives tests a stable place to verify routing and refresh behavior.

**Alternatives considered**:

- Keep all orchestration in `App.tsx`: rejected because it becomes an integration sink.
- Put orchestration in `RunExplorer`: rejected because run-scoped UI should not parse routes or own app-wide loading states.

## Decision 3: Split Hooks By Responsibility

**Decision**: Replace a broad `useDashboardData` shape with small hooks for status, sessions, selected run, artifact detail, refresh lifecycle, and URL state.

**Rationale**: Each hook should have one reason to change and one clear test surface. Composition belongs in the controller layer.

**Alternatives considered**:

- Keep one hook and add internal helpers: rejected because the public hook would still couple unrelated state domains.
- Use global state first: rejected until dashboard complexity proves it is needed.

## Decision 4: Keep Filter And Sort Logic Pure

**Decision**: Implement filter, search, sort, and row visibility as pure utilities.

**Rationale**: These rules need deterministic fixture tests and should not depend on React rendering, API clients, or browser state.

**Alternatives considered**:

- Inline logic in components: rejected because it is hard to test and easy to duplicate.
- Ask the API to perform all view filtering: rejected because local view filters are app state over API-provided safe fields.

## Decision 5: Centralize Privacy Display Policy

**Decision**: Add one app-owned privacy display policy for labels, severity, fallback text, and raw-content display eligibility.

**Rationale**: Privacy state appears in lists, tables, details, empty states, and caveats. Centralization prevents inconsistent labels and accidental raw-content exposure.

**Alternatives considered**:

- Let each component render privacy independently: rejected because privacy behavior must be uniform.
- Import root privacy policy: rejected because dashboard source must remain isolated and contract-facing.

## Decision 6: Route Only By `run_id`

**Decision**: Use API-routable `run_id` for URL state, selected-run state, and API calls. Treat `canonical_run_id` as display/diagnostic metadata only.

**Rationale**: The dashboard API route is keyed by routable run IDs. Canonical IDs may be stable analysis identifiers but are not browser route identifiers.

**Alternatives considered**:

- Prefer `canonical_run_id` when present: rejected because it can break API routing.
- Store both in selection state: rejected because it invites accidental route construction from the wrong ID.
