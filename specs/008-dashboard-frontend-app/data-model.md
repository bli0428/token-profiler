# Data Model: Isolated Dashboard Frontend App

## DashboardAppApiClient

Owns browser-side HTTP access to the dashboard API contract.

**Fields / state**:

- `baseUrl`: Local dashboard API origin.
- `schemaVersion`: Supported successful response version.
- `status`: Last service status response.
- `lastUpdatedAt`: Most recent successful response timestamp.
- `inFlight`: Whether a request is active.
- `error`: Structured client error, offline state, or version mismatch.

**Relationships**:

- Fetches `DashboardApiStatus`, `DashboardApiSession`, `DashboardApiRun`, and `DashboardApiArtifactDetail` payloads from the HTTP API.
- Updates `DashboardAppViewState`.

**Validation rules**:

- Successful responses must include supported `schema_version`.
- Structured API errors must remain displayable without stack traces or raw content.
- Network failures must be normalized to an offline/local-connection state.
- Browser API base URL configuration must use `VITE_DASHBOARD_API_BASE_URL`.

## DashboardAppContractFixtures

Represents API-real and edge fixtures used to guard duplicated client contract types.

**Fields**:

- `status`: API-real status envelope.
- `sessions`: API-real sessions envelope.
- `run`: API-real selected run envelope.
- `artifactDetail`: API-real artifact detail envelope.
- `edgeFixtures`: Offline, not-found, partial, stale, metadata-only, hidden-content, large-run, and unsupported-version fixtures.
- `normalizationNotes`: Documented volatile fields such as generated timestamps.

**Validation rules**:

- API-real fixtures must come from spec 007 responses, not imagined client-only shapes.
- API-real fixtures must be captured through HTTP using the dashboard API endpoints, not by importing root `src` builders or reading local JSONL files directly.
- Fixture-loading helpers live under `dashboard/test/helpers/` and must not be imported by production `dashboard/src/**` modules.
- Dashboard tests consume fixture JSON without importing root `src`.
- Metadata-only and hidden fixtures contain zero hidden raw prompt, command output, patch, file-content, or message bodies.
- Fixtures include routable `run_id` and optional `canonical_run_id` where applicable.

## DashboardAppShell

Represents app-wide layout and top-level status rendering.

**Fields / responsibilities**:

- App frame and responsive shell layout.
- Status-ready, offline, version-mismatch, empty, and retry state presentation.
- Controller output wiring to session and run views.

**Validation rules**:

- `App.tsx` mounts this shell and does not own run exploration orchestration.
- Shell does not implement filtering, sorting, artifact detail loading, or refresh reconciliation.

## DashboardAppController

Owns dashboard route/view state and data orchestration.

**Fields / responsibilities**:

- API status, session list, selected run, selected artifact detail, refresh lifecycle, and URL state.
- User actions for selecting sessions, tasks, artifacts, filters, sort, retry, and refresh.
- State reconciliation after refreshed data arrives.

**Validation rules**:

- Uses small hooks internally rather than one all-purpose data hook.
- Uses routable `run_id` for API calls and URL state.
- Does not render feature UI directly.

## DashboardAppViewState

Represents the user's active navigation and filtering choices.

**Fields**:

- `selectedRunId`: Selected session/run ID.
- `selectedTaskGroupId`: Selected task scope, if any.
- `selectedArtifactId`: Selected artifact detail, if any.
- `categoryFilter`: Selected artifact category or all categories.
- `searchQuery`: Privacy-safe text search input.
- `sortKey`: Active artifact table sort key.
- `sortDirection`: Ascending or descending.
- `refreshMode`: Manual or interval refresh.
- `lastRefreshResult`: Success, partial, stale, not-found, offline, or version mismatch.

**Validation rules**:

- `selectedRunId` stores the API-routable session `run_id`.
- Sort keys correspond to API artifact row fields after client-boundary normalization.
- Preserve selected entities across refresh only when they still exist.
- Clear selected task or artifact when refreshed data no longer contains it.
- Search operates only on API-provided safe text fields.

## DashboardAppSessionList

Represents the session selection surface.

**Fields**:

- `sessions`: Ordered API session records.
- `loading`: Whether sessions are loading.
- `empty`: Whether no sessions are available.
- `availabilitySummary`: Counts of complete, partial, and unavailable sessions.
- `caveats`: Global or session-level caveats visible in the list.

**Relationships**:

- Selecting a session loads one `DashboardAppRunExplorer`.

**Validation rules**:

- Sessions display safe labels and timestamps from the API.
- Selecting a session uses `session.run_id` for `/api/runs/:runId`; optional `canonical_run_id` is not used for routing.
- Unavailable and partial sessions remain selectable only when the API provides enough detail to attempt loading.

## DashboardAppRunExplorer

Represents the selected run workspace.

**Fields**:

- `run`: API run payload.
- `overview`: API overview metrics for the selected run or task scope.
- `taskGroups`: API task groups.
- `artifactRows`: API artifact rows after active filters and sort.
- `filterOptions`: API-provided categories, task options, and safe search fields.
- `privacy`: Run privacy state.
- `caveats`: Run, task, artifact, and attribution caveats.

**Relationships**:

- Contains one `DashboardAppArtifactDetailPanel` when an artifact is selected.
- Reads filter/sort choices from `DashboardAppViewState`.

**Validation rules**:

- Does not recompute analyzer totals, task grouping, privacy decisions, or attribution caveats.
- Missing metrics render as unavailable, not zero, unless the API reports zero.
- Task scoping filters API rows and displayed summaries without inventing new analyzer facts.
- Receives explicit run-scoped state and callbacks from the controller.

## DashboardAppArtifactDetailPanel

Represents artifact drilldown data.

**Fields**:

- `artifactId`: Stable artifact identifier.
- `title`: Safe display title.
- `identity`: API-provided identity fields.
- `metrics`: Exposure, replay, inclusion, persistence, and attribution facts.
- `metadataSections`: Privacy-safe display sections.
- `relationships`: Tool links and task membership.
- `privacy`: Hidden, metadata-only, preview, raw-available, unavailable, or uncaptured state.
- `caveats`: Artifact-level caveats.

**Validation rules**:

- Hidden raw content must not render.
- Hidden, unavailable, and uncaptured states must remain visually distinguishable.
- Detail not-found errors must keep the selected run visible when possible.

## DashboardAppFixtureDataset

Represents deterministic API-compatible responses for app tests.

**Fields**:

- `status`: Service status fixture.
- `sessions`: Normal and empty session list fixtures.
- `runs`: Normal, large, partial, metadata-only, and stale run fixtures.
- `artifacts`: Detail and not-found fixtures.
- `errors`: Offline, structured API error, and version-mismatch fixtures.

**Validation rules**:

- Fixtures follow the public contract from spec 007.
- Metadata-only fixtures include no hidden raw prompt, command output, patch, file-content, or message bodies.
- Large fixture contains at least 1,000 artifact rows.

## DashboardAppPrivacyPolicy

Central policy for privacy display.

**Fields / responsibilities**:

- Privacy labels for hidden, metadata-only, unavailable, uncaptured, preview, raw-available, stale, and partial states.
- Severity and visual-state names for shared components.
- Safe fallback copy when raw content is unavailable or hidden.

**Validation rules**:

- Components do not invent privacy labels independently.
- Raw content display decisions remain derived from API privacy fields.

## DashboardAppStyleSystem

Dashboard-owned style modules and tokens.

**Fields / responsibilities**:

- `tokens.css`: colors, spacing, typography, borders, focus, and responsive values.
- `layout.css`: app shell, panes, panels, grids, and toolbars.
- `states.css`: loading, empty, offline, version mismatch, partial, stale, selected, focus, disabled, privacy, and caveat states.
- Feature styles for sessions, run explorer, tables, and detail panels.

**Validation rules**:

- Root styles are not imported.
- `app.css` is not a catch-all stylesheet.
- Text, controls, tables, and detail panels do not overlap incoherently on mobile or desktop.
