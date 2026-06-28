# Data Model: Request-First Dashboard

## DashboardSessionListItem

Surface representation of one selectable session in the left navigation.

**Fields**

- `runId`: routable dashboard run identifier.
- `label`: primary display label.
- `identityLabel`: Codex-facing label or identifier when supplied.
- `mappingConfidence`: confidence for Codex identity mapping.
- `tokenTotals`: headline totals for ranking high-cost sessions.
- `availability`: request accounting availability for the session/run.
- `limitations`: user-visible identity or usage caveats.
- `selected`: whether this session is active.

**Validation Rules**

- `runId` remains the route key even when Codex identity is displayed.
- Missing token totals are represented as unavailable or partial, not zero.
- Mapping limitations are displayed when confidence is not one-to-one.

## RequestListView

The selected-run center pane organized around chronological requests.

**Fields**

- `availability`: request accounting availability for the run.
- `summary`: run-level request accounting counts and headline request IDs.
- `rows`: ordered `RequestRowView[]`.
- `caveats`: run-level request accounting caveats.
- `state`: loading, ready, empty, partial, unsupported, or error.

**Validation Rules**

- Row order follows the API contract order; the browser does not sort by derived usage.
- Empty or unsupported states are explicit and do not fall through to aggregate artifact-first rendering.
- Run-level caveats remain visible even when individual rows are collapsed.

## RequestRowView

One provider request row in the selected run.

**Fields**

- `requestId`: stable request identifier.
- `timestampLabel`: display timestamp or unavailable state.
- `chronologyIndex`: deterministic position supplied by contract.
- `usageMetrics`: provider-reported cached input, uncached input, total input, output, and total values when available.
- `availability`: usage and attribution completeness.
- `artifactCount`: number of request-scoped inclusions.
- `localEstimateSummary`: local artifact token estimate summary when supplied.
- `expanded`: whether nested artifacts are visible.
- `caveats`: request-level caveats.

**Validation Rules**

- Provider totals are visually/textually distinct from local estimates.
- Missing usage metrics display unavailable or partial labels.
- Expansion controls expose expanded/collapsed state and do not change row ordering.

## RequestArtifactDisplayItem

One artifact inclusion nested under a request.

**Fields**

- `artifactId`: identifier used for detail lookup when available.
- `stableShortId`: short identifier for compact display.
- `displayName`: privacy-safe label.
- `displayCategory`: artifact category.
- `requestOrder`: ordering within the request.
- `localTokenCount`: local estimated token count.
- `estimatedCachedInputTokens`: request-scoped estimated cached contribution when supplied.
- `estimatedUncachedInputTokens`: request-scoped estimated uncached contribution when supplied.
- `attributionState`: completeness/quality of local attribution.
- `privacy`: dashboard privacy display state.
- `detailAvailable`: whether artifact detail can be opened.
- `caveats`: artifact-level caveats.

**Validation Rules**

- Raw content fields are never required for this nested row.
- Hidden, metadata-only, preview, raw-available, and unavailable states are rendered distinctly using existing privacy display policy.
- Estimated counts are labeled as estimates and never summed into provider request totals by browser code.

## RequestAccountingViewState

Surface-owned interaction state for the request-first workflow.

**Fields**

- `selectedRunId`: current session/run route key.
- `expandedRequestIds`: request IDs expanded by the user.
- `selectedArtifactId`: artifact selected for secondary detail.
- `focusedRequestId`: optional request focus target after keyboard interaction.
- `dataState`: loading, ready, empty, partial, unsupported, refreshing, or error.

**Validation Rules**

- Changing sessions clears stale expanded requests and selected artifacts that do not belong to the new run.
- Refresh preserves valid selection when IDs still exist.
- Keyboard navigation can expand a request and open artifact detail without losing the selected session.

## ArtifactDetailDrilldown

Existing secondary artifact detail behavior reached from a request inclusion.

**Fields**

- `artifactId`: selected artifact identifier.
- `sourceRequestId`: request from which the artifact was selected, when applicable.
- `detail`: dashboard-safe artifact detail payload.
- `privacy`: privacy display state.
- `state`: available, unavailable, loading, or error.

**Validation Rules**

- Detail state must not show stale data after session or request changes.
- Detail rendering continues to obey existing privacy tests.
- Lack of detail support does not prevent request row expansion.
