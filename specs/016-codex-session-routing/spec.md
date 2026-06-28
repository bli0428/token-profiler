# Feature Specification: Codex Session Routing

**Feature Branch**: `016-codex-session-routing`

**Created**: 2026-06-28

**Status**: Draft

**Input**: User description: "Add grouping by id for new traffic after restarting the proxy. Keep underlying src changes separate from dashboard work. Do not concern this feature with backward compatibility; new live traffic should be grouped by Codex session."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - New Traffic Groups By Codex Session (Priority: P1)

A user restarts the live proxy, captures Codex traffic, and sees all requests from the same Codex session recorded under one stable session grouping.

**Why this priority**: The original concern is avoiding cache-key or prompt-based grouping when Codex already provides a session identity for new requests.

**Independent Test**: Send multiple live-style Codex requests that carry the same Codex session identity and verify they resolve to the same local session grouping, even when request body cache hints differ.

**Acceptance Scenarios**:

1. **Given** two new Codex requests carry the same Codex session identity, **When** the proxy ingests them, **Then** both requests are assigned to the same local session group.
2. **Given** two new Codex requests carry different Codex session identities, **When** the proxy ingests them, **Then** they are assigned to different local session groups.
3. **Given** a Codex request contains both Codex session identity and provider cache hints, **When** the proxy resolves the session group, **Then** Codex session identity determines the grouping.

---

### User Story 2 - Identity Resolution Is Explainable (Priority: P1)

A user or developer can inspect a captured request/session and understand which observed Codex identity field determined the local grouping.

**Why this priority**: Session grouping must be trustworthy; when multiple identity hints exist, the system should expose the chosen reason without requiring source-code archaeology.

**Independent Test**: Ingest requests containing several identity hints and verify the recorded session source identifies the Codex session field or fallback that determined grouping.

**Acceptance Scenarios**:

1. **Given** a request has full Codex turn metadata, **When** the session is resolved, **Then** the recorded source identifies turn metadata as the grouping reason.
2. **Given** a request lacks full turn metadata but has compatibility session identity, **When** the session is resolved, **Then** the recorded source identifies the compatibility identity.
3. **Given** a request lacks Codex session identity, **When** fallback routing is used, **Then** the recorded source does not pretend the group is a Codex session.

---

### User Story 3 - Observed Request Shape Remains Auditable (Priority: P2)

A developer can look at one adapter-owned contract and see the Codex request shape the proxy expects to ingest before it maps to generalized session grouping.

**Why this priority**: Clear ingestion shape prevents future regressions where important Codex identity or request fields are missed.

**Independent Test**: Review the adapter contract and request-shape diagnostics for representative live Codex requests and verify known request body, header, metadata, input, and tool fields are accounted for.

**Acceptance Scenarios**:

1. **Given** a representative Codex request body, **When** it is parsed at ingestion, **Then** known body fields are validated according to their expected shape.
2. **Given** a request includes unknown top-level body fields, **When** it is parsed, **Then** those fields are exposed as diagnostics rather than used for grouping.
3. **Given** a known nested request field has the wrong shape, **When** it is parsed, **Then** the mismatch is rejected or surfaced clearly.

### Edge Cases

- A request may include both canonical turn metadata and compatibility identity fields; canonical Codex session identity should win.
- A request may include provider cache keys that match another session; cache keys must not merge different Codex sessions.
- A request may omit Codex session identity entirely; fallback grouping remains allowed but must be labeled as fallback, not as Codex-session grouping.
- A malformed known identity field should not silently produce a misleading session group.
- A future top-level request field may appear; it should be observable as an unknown field without becoming a grouping key.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST group new live Codex traffic by Codex session identity when that identity is present.
- **FR-002**: Codex session identity MUST take precedence over provider cache keys, prompt fingerprints, conversation identifiers, and generated fallbacks.
- **FR-003**: Requests with the same Codex session identity MUST resolve to the same local session group after the proxy is restarted with this feature.
- **FR-004**: Requests with different Codex session identities MUST resolve to different local session groups.
- **FR-005**: The system MUST expose the source of the session grouping decision for captured requests.
- **FR-006**: The system MUST preserve separate observations for full Codex turn metadata, compatibility metadata, direct headers, and provider body fields before choosing a grouping identity.
- **FR-007**: The system MUST validate known observed Codex request fields at the adapter boundary before mapping to generalized session grouping.
- **FR-008**: Unknown top-level request fields MAY be accepted only as diagnostics; they MUST NOT determine session grouping until explicitly modeled.
- **FR-009**: The system MUST NOT include migration or backfill behavior for traffic captured before this feature.
- **FR-010**: The system MUST preserve existing privacy-mode behavior and MUST NOT require storing raw prompt, input, tool, or instruction content to group by Codex session.
- **FR-011**: The grouping result MUST be available to downstream canonical records or summaries without exposing provider-specific raw payloads outside the adapter boundary.

### Key Entities *(include if feature involves data)*

- **ObservedCodexRequest**: The adapter-owned request boundary containing observed headers, request body fields, and Codex metadata projections.
- **CodexSessionIdentity**: The Codex-provided session-level identity used to group new live traffic.
- **SessionGroupingDecision**: The selected local session group plus the reason or source field used to choose it.
- **FallbackGroupingDecision**: A non-Codex-session grouping used only when Codex session identity is unavailable.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a new capture, at least two requests from the same Codex session appear under one local session group.
- **SC-002**: In a new capture, requests from two different Codex sessions do not appear under the same local session group because of a shared cache key.
- **SC-003**: A captured request with Codex session identity reports an explicit grouping source tied to that Codex identity.
- **SC-004**: A captured request without Codex session identity reports a fallback grouping source rather than a Codex-session source.
- **SC-005**: Known malformed request-shape fields are rejected or surfaced in tests before they can influence grouping.
- **SC-006**: Metadata-only capture mode can group by Codex session without storing raw prompt, instruction, input, or tool bodies.

## Assumptions

- This feature applies only to new live traffic after the proxy process has restarted with the new behavior.
- Historical `codex-cache-*` or fallback-routed runs are out of scope and do not need migration.
- Codex session identity is available in the observed request for the primary target workflow.
- Dashboard presentation of grouped sessions is handled by a separate dashboard specification.
