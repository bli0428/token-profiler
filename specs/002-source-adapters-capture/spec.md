# Feature Specification: Source Adapters And Capture Boundaries

**Feature Branch**: `002-source-adapters-capture`

**Created**: 2026-06-25

**Status**: Draft

**Input**: User description: "Support Codex CLI/app, Claude Code, and provider-compatible sources without making analyzers provider-specific."

## User Scenarios & Testing

### User Story 1 - Codex Proxy Source (Priority: P1)

A user can route Codex CLI or the Codex app through the local proxy and capture canonical events without changing the upstream request or response stream.

**Why this priority**: The current MVP proves this is the most reliable way to see actual request context for Codex.

**Independent Test**: Send a synthetic Responses API request through the proxy and verify the upstream receives identical bytes while the local store receives canonical events.

**Acceptance Scenarios**:

1. **Given** Codex is configured to use the local proxy, **When** it sends a streaming request, **Then** the proxy records artifacts and streams the upstream response unchanged.
2. **Given** the proxy is restarted, **When** capture resumes, **Then** new events use the current schema without corrupting older runs.
3. **Given** a request includes function calls and outputs, **When** events are emitted, **Then** call/output pairs share stable call IDs and inherited metadata.

---

### User Story 2 - Log Import Source (Priority: P2)

A user can import Codex rollout JSONL or similar local logs to reconstruct request timelines and usage when live proxy capture was not active.

**Why this priority**: Historical analysis and recovery from proxy gaps are useful, but log imports may be incomplete.

**Independent Test**: Import a fixture rollout file and verify canonical usage and artifact records are created with source limitation notes.

**Acceptance Scenarios**:

1. **Given** a Codex rollout file with token usage events, **When** it is imported, **Then** request usage events are stored with the source marked as log import.
2. **Given** a rollout file contains response items for tool calls, **When** it is imported, **Then** task/tool metadata is extracted where available.

---

### User Story 3 - Claude Code Adapter Seam (Priority: P2)

A developer can add a Claude Code telemetry/log adapter that maps Claude events into the same canonical schema used by Codex capture.

**Why this priority**: The tool should compare agent context behavior across Codex and Claude Code without duplicating analyzers.

**Independent Test**: Feed a Claude-style fixture containing request/token/tool events and verify canonical request, usage, and artifact events.

**Acceptance Scenarios**:

1. **Given** Claude telemetry exposes tool result tokens and tool IDs, **When** imported, **Then** the canonical artifacts preserve tool identity, result size, and source limitation notes.
2. **Given** Claude telemetry lacks exact prompt composition, **When** imported, **Then** reports document that limitation.

### Edge Cases

- Proxy starts while an old process is still shutting down.
- Provider payloads include compressed request bodies.
- Codex app and CLI may produce different headers/session identifiers.
- Claude Code may expose telemetry categories without exact prompt artifacts.
- A run may contain events produced by multiple versions of the proxy.

## Requirements

### Functional Requirements

- **FR-001**: System MUST define a source adapter interface that emits canonical events.
- **FR-002**: System MUST keep analyzer modules independent of provider-specific payloads.
- **FR-003**: Codex proxy capture MUST preserve upstream request/response behavior.
- **FR-004**: Codex proxy capture MUST support CLI wrapper and persistent config modes.
- **FR-005**: System MUST support importers for local log/rollout files.
- **FR-006**: Source adapters MUST record known source limitations.
- **FR-007**: Tool call outputs MUST inherit available metadata from paired tool calls.
- **FR-008**: Source adapters MUST honor the selected storage/privacy mode.

### Key Entities

- **SourceAdapter**: Converts provider-specific data into canonical events.
- **CaptureSession**: Groups related requests under a stable run/session ID.
- **SourceLimitations**: Indicates missing or partial source data that affects completeness.
- **ProviderPayload**: The raw provider-specific request, response, or log event before normalization.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Codex proxy integration tests verify byte-preserving forwarding for uncompressed and compressed request bodies.
- **SC-002**: At least one Codex fixture and one Claude-style fixture normalize to the same canonical event types.
- **SC-003**: Analyzer tests run against canonical fixtures without importing provider-specific modules.
- **SC-004**: Restarting the proxy does not require deleting existing run data.

## Assumptions

- Codex remains observable through local provider routing or wrapper commands.
- Claude Code integration may start as import-only if live proxying is not feasible.
- Provider APIs and local logs may change; adapters should fail with clear diagnostics.
