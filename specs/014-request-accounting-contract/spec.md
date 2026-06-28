# Feature Specification: Request Accounting Contract

**Feature Branch**: `014-request-accounting-contract`

**Created**: 2026-06-27

**Status**: Draft

**Input**: User description: "Expose request-level accounting so a user can see which Codex session burned tokens, which request within that session burned tokens, and which request-scoped artifacts likely contributed, while keeping changes separated from dashboard rendering."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Rank Requests By Provider Usage (Priority: P1)

A user can inspect one captured session and see every provider request in chronological order with authoritative token totals, including cached and uncached input tokens when reported.

**Why this priority**: The first product goal is to identify which requests burned the most tokens. Provider-reported request usage is the trusted source for this.

**Independent Test**: Load a captured session with multiple request usage records and verify the request list exposes each request with timestamp, total input, cached input, uncached input, output, and total tokens without requiring artifact analysis.

**Acceptance Scenarios**:

1. **Given** a session has provider usage for multiple requests, **When** the request accounting contract is read, **Then** each request exposes cached and uncached input token counts where available.
2. **Given** requests occurred at different times, **When** the request list is read, **Then** requests are ordered by chronology with a deterministic fallback for identical timestamps.
3. **Given** a request has no completed usage record, **When** the request appears in accounting output, **Then** its usage availability is marked incomplete rather than shown as zero.

---

### User Story 2 - Preserve Session Identity For Codex Runs (Priority: P1)

A user can correlate dashboard sessions with the existing Codex session/run identity used by the capture layer, so the left-side session list remains meaningful and stable.

**Why this priority**: The user wants the dashboard session list to be as close as possible to a one-to-one view of Codex sessions, not a separate arbitrary grouping.

**Independent Test**: Load captured runs routed from Codex sessions and verify each exposed session has a stable route identifier plus any available Codex-facing identity or label for display and diagnostics.

**Acceptance Scenarios**:

1. **Given** a run has a Codex-derived session identifier, **When** sessions are listed, **Then** that identifier is exposed for display or diagnostics without replacing the route identifier.
2. **Given** the capture source cannot prove one-to-one Codex session identity, **When** sessions are listed, **Then** the limitation is disclosed with an availability state or caveat.

---

### User Story 3 - Explain Request Cost With Request-Scoped Artifacts (Priority: P2)

A user can expand an expensive request and see the artifacts included in that specific request with local estimated token counts and cache attribution caveats.

**Why this priority**: The second step after finding an expensive request is understanding likely contributors, but those contributor numbers are estimates and must stay request-scoped.

**Independent Test**: Load a session containing a request with multiple artifacts and verify each request exposes its included artifacts, local token count, estimated cached/uncached contribution where possible, order within the request, and attribution caveats.

**Acceptance Scenarios**:

1. **Given** a request has captured artifacts with local offsets, **When** request detail is read, **Then** the artifacts are shown in request order with local token estimates.
2. **Given** provider cached-token totals and local artifact offsets are available, **When** request detail is read, **Then** each artifact includes estimated cached and uncached portions for that request.
3. **Given** artifact offsets are missing or provider usage is unavailable, **When** request detail is read, **Then** artifact cache attribution is marked partial or unavailable.

### Edge Cases

- A provider response may fail, stream incompletely, or omit usage; the request must still be representable without fabricated token totals.
- Multiple requests may share the same timestamp; ordering must remain deterministic.
- Captured artifacts may be metadata-only, preview, raw, or unavailable; request accounting must not require raw content retention.
- A single artifact may appear in many requests; request detail must distinguish this request's inclusion from aggregate artifact totals.
- Some visible request payload items may be opaque or encrypted; local artifact estimates must remain caveated and must not imply provider-authoritative per-artifact accounting.
- Session routing may use Codex cache/conversation identifiers, wrapper headers, or fallback fingerprints; the confidence of one-to-one Codex session mapping must be explicit.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST expose a request-level accounting view for each captured session.
- **FR-002**: Each request accounting row MUST include a stable request identifier, chronological timestamp when known, and availability state.
- **FR-003**: Each request accounting row MUST include provider-reported input, cached input, uncached input, output, and total token counts when available.
- **FR-004**: Missing provider usage MUST be represented as unavailable or partial, never as zero unless the provider reported zero.
- **FR-005**: Request rows MUST be ordered chronologically by default, with deterministic ordering for ties or missing timestamps.
- **FR-006**: Session records MUST expose stable routing identity and any available Codex-derived identity or diagnostic label without conflating display identity with route identity.
- **FR-007**: The contract MUST disclose when a displayed session cannot be proven one-to-one with an existing Codex session.
- **FR-008**: Request detail MUST expose the artifacts included in that request, not only aggregate artifact rows across the whole session.
- **FR-009**: Request-scoped artifact entries MUST include request order, local token count, and request-specific estimated cached and uncached token attribution when the necessary facts are available.
- **FR-010**: Request-scoped artifact entries MUST include caveats or availability state when attribution depends on local tokenization, inferred ordering, opaque content, missing offsets, or missing provider usage.
- **FR-011**: Request accounting outputs MUST preserve privacy modes and must not require storing raw prompt, file, command, tool output, or message bodies.
- **FR-012**: Request accounting MUST remain an analyzer/API concern; browser surfaces MUST consume the exposed contract rather than recomputing request totals or request-scoped attribution.
- **FR-013**: Existing aggregate artifact views MAY remain available, but request accounting MUST be sufficient to identify high-cost requests without using artifact aggregation.

### Key Entities *(include if feature involves data)*

- **RequestAccountingRow**: A provider request within one captured session, including identity, chronology, availability, and provider-reported token totals.
- **RequestArtifactInclusion**: One artifact's inclusion in one request, including request order, local token count, request-local estimated cache attribution, privacy state, and caveats.
- **SessionIdentityMapping**: The relationship between the capture run identifier, any Codex-derived session identity, and the confidence or limitation attached to that mapping.
- **RequestUsageAvailability**: The completeness state for provider usage and local attribution facts on a request.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can identify the highest-total and highest-uncached request in a session from request accounting output within two minutes.
- **SC-002**: A request with provider usage displays cached and uncached input token counts exactly as reported by the provider-side usage event.
- **SC-003**: A request without provider usage is visibly marked incomplete and does not display fabricated token totals.
- **SC-004**: A request with multiple captured artifacts can be inspected as request-scoped inclusions rather than only as run-level aggregate artifacts.
- **SC-005**: Metadata-only captures continue to expose request accounting without storing or displaying hidden raw content.
- **SC-006**: Session identity limitations are visible when the system cannot prove one-to-one mapping to a Codex session.

## Assumptions

- Provider-reported request usage remains the authoritative source for request token totals.
- Existing captured request summaries already carry chronology from canonical event timestamps, but the public dashboard contract does not yet expose a request-first view.
- Request-scoped artifact token attribution is useful as an estimate, not as provider-authoritative per-artifact billing.
- One-to-one Codex session mapping is a target behavior where available, but some historical or fallback-routed captures may only support best-effort identity.
