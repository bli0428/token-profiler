# Feature Specification: Codex Turn Request Drilldown

**Feature Branch**: `018-codex-turn-request-drilldown`

**Created**: 2026-06-29

**Status**: Ready for Planning

**Input**: User description: "Extract Codex `turn_id` as a clean first-class key, then expose dashboard grouping as turns that expand into requests that expand into artifacts. Turns should be titled by the user turn preview, and requests should be titled by the assistant message/summary preview. Prefer cleaner explicit architecture over backward compatibility."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Capture A First-Class Turn Key (Priority: P1)

A user captures new Codex traffic and can rely on each request being associated with the Codex turn that caused it, without guessing from repeated prompt text or request order.

**Why this priority**: Turn grouping is the missing layer between session and request. Without a first-class turn key, dashboard grouping remains heuristic and will keep accumulating edge cases.

**Independent Test**: Capture representative Codex requests that include turn metadata and verify each captured request exposes a stable turn identity that is separate from session identity and request identity.

**Acceptance Scenarios**:

1. **Given** a new Codex request includes turn identity, **When** the proxy records it, **Then** downstream data exposes that turn identity as a first-class grouping key.
2. **Given** two requests belong to the same Codex turn, **When** they are analyzed, **Then** they share the same turn grouping key.
3. **Given** two requests belong to different Codex turns in the same session, **When** they are analyzed, **Then** they appear under different turn groups.

---

### User Story 2 - Inspect A Session By Turns, Requests, And Artifacts (Priority: P1)

A user opens a captured Codex session and sees the work organized as turns, where each turn expands into its requests, and each request expands into the artifacts already captured for that request.

**Why this priority**: The dashboard should match how users reason about agent work: "what I asked," then "what the agent did to continue," then "what content was in context."

**Independent Test**: Load a run with multiple turns and multiple requests within at least one turn, then verify the dashboard presents a stable three-level hierarchy.

**Acceptance Scenarios**:

1. **Given** a run contains multiple turns, **When** the run detail loads, **Then** the primary drilldown groups requests under turn rows.
2. **Given** one turn contains multiple requests, **When** the user expands that turn, **Then** each request appears as a child row of that turn.
3. **Given** a request contains captured artifacts, **When** the user expands that request, **Then** artifact details remain available as the deepest drilldown level.

---

### User Story 3 - Read Natural Titles At Each Level (Priority: P1)

A user can identify each turn by the user-facing turn preview, and each request by the assistant message or summary that explains what the agent was about to do.

**Why this priority**: IDs like `proxy_...` or `message:user:1:0` are useful evidence, but they do not help users quickly understand a session.

**Independent Test**: Analyze captured data with user previews, assistant previews, tool calls, and missing previews, then verify title selection follows the documented fallback rules.

**Acceptance Scenarios**:

1. **Given** a turn has a user-message preview, **When** the turn row is rendered, **Then** the turn title uses that preview.
2. **Given** a request has an assistant message or summary preview, **When** the request row is rendered, **Then** the request title uses that assistant preview.
3. **Given** a title preview is unavailable due to capture policy or missing data, **When** the row is rendered, **Then** the row uses an explicit fallback that does not pretend richer content exists.

---

### User Story 4 - Preserve Module Boundaries (Priority: P2)

A maintainer can evolve capture, analysis, API, and dashboard rendering independently because each layer owns only its contract and does not parse another layer's private data.

**Why this priority**: This feature crosses multiple domains, so clean separation is the difference between durable architecture and long-term dashboard-specific debt.

**Independent Test**: Review the feature contracts and verify provider-specific fields terminate at capture, analyzers consume canonical turn facts, and the dashboard consumes only dashboard API fields.

**Acceptance Scenarios**:

1. **Given** Codex-specific turn metadata exists in a request, **When** the system records it, **Then** provider-specific shape is mapped before leaving the capture boundary.
2. **Given** the analyzer builds turn groups, **When** it reads input data, **Then** it uses canonical turn/request/artifact facts rather than raw provider payloads.
3. **Given** the dashboard renders the hierarchy, **When** it receives run detail data, **Then** it does not infer turns or labels from raw Codex metadata.

### Edge Cases

- A request may have no turn identity; it should remain visible in an explicit unassigned or fallback group with a clear limitation.
- A turn may contain multiple user-message artifacts because context is replayed; title selection should use the canonical turn-title candidate, not every repeated user artifact.
- A request may contain multiple assistant previews; request title selection must be deterministic.
- Metadata-only capture may hide user or assistant content previews; grouping by turn must still work when the turn key is present.
- Existing JSONL captured before first-class turn identity may lack the key; migration, compatibility shims, and heuristic backfill are out of scope.
- A request may include session identity, thread identity, turn identity, and cache hints; the hierarchy must keep session, turn, request, and artifact identities distinct.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST expose Codex turn identity as a first-class key for new captured traffic when the source request provides it.
- **FR-002**: Turn identity MUST be represented separately from session identity, request identity, response identity, artifact identity, and cache hints.
- **FR-003**: Requests sharing the same turn identity within a run MUST appear under the same turn group.
- **FR-004**: Requests with different turn identities within a run MUST appear under different turn groups.
- **FR-005**: New requests without turn identity MUST remain visible in a clearly labeled fallback grouping when they are otherwise part of the analyzed run.
- **FR-006**: The run-detail view model MUST expose a hierarchy of turns, child requests, and request artifact references.
- **FR-007**: Turn titles MUST prefer a privacy-permitted user turn preview when available.
- **FR-008**: Request titles MUST prefer a privacy-permitted assistant message or summary preview from that request when available.
- **FR-009**: Title fallback behavior MUST be deterministic and MUST avoid using internal identity labels as the first visible title when richer previews exist.
- **FR-010**: The dashboard MUST render the hierarchy from dashboard API fields and MUST NOT parse Codex request payloads, headers, cache keys, or raw provider metadata.
- **FR-011**: Analyzers MUST consume canonical turn/request/artifact records only.
- **FR-012**: Provider-specific Codex metadata MUST terminate at the capture/adapter boundary after being mapped to canonical fields.
- **FR-013**: The feature MUST preserve capture policy behavior: metadata-only mode may still expose turn grouping keys while withholding content previews.
- **FR-014**: The feature MUST NOT require historical migration or backfill for runs captured before first-class turn identity.
- **FR-015**: When a clean explicit model conflicts with backward compatibility for old local data, the clean explicit model MUST take precedence.

### Key Entities *(include if feature involves data)*

- **Codex Turn Identity**: The source-provided identity for one user turn within a Codex session.
- **Canonical Turn Fact**: Provider-neutral stored fact that associates one or more requests with a turn.
- **Turn Group**: Analyzer output representing one turn, its title, confidence or fallback state, metrics, and child request references.
- **Request Presentation Row**: Analyzer or API output representing one request with a human-readable title and artifact references.
- **Artifact Detail**: Existing captured content unit that remains the deepest drilldown level.
- **Title Candidate**: Privacy-aware preview or fallback value considered for turn or request titles.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: New captured Codex traffic with two turns in one session displays as two distinct turn groups in the run detail.
- **SC-002**: A turn with multiple proxy requests displays those requests as children of one turn rather than as unrelated top-level rows.
- **SC-003**: At least one request title in a multi-request turn uses an assistant preview such as "I’ll run the focused checks now..." instead of a proxy ID.
- **SC-004**: A turn title uses the user turn preview when capture policy permits preview content.
- **SC-005**: Metadata-only capture still groups requests by turn identity without revealing hidden user or assistant content.
- **SC-006**: Dashboard code can render the hierarchy without reading provider-specific payload fields.
- **SC-007**: New captured requests without first-class turn identity remain inspectable within the new model, with explicit fallback labeling rather than silent heuristic certainty.

## Assumptions

- The target source is new live Codex traffic after the proxy has restarted with this feature.
- Codex turn metadata includes a stable turn identity for the primary workflow.
- Existing request accounting and artifact detail behavior remain valuable and should be nested under turns rather than replaced.
- Historical local captures do not need migration, compatibility shims, or inferred turn backfill.
- Raw content storage is not required for turn grouping; previews are used only for titles when capture policy permits them.
