# Feature Specification: Large Run Explorer

**Feature Branch**: `019-large-run-explorer`  
**Created**: 2026-07-24  
**Status**: Draft

## User Scenarios & Testing

### User Story 1 - Open a large captured session (Priority: P1)

An investigator opens a captured session containing hundreds of thousands of events and can see its size, request totals, token totals, and the newest requests without the dashboard marking it unreadable or exhausting process memory.

**Why this priority**: Large autonomous-agent captures are the sessions most in need of analysis.

**Independent Test**: A fixture larger than the whole-file reader limit is indexed and its first request page is returned without loading all events into memory.

**Acceptance Scenarios**:

1. **Given** a run whose event log exceeds the legacy whole-file limit, **When** it is listed or opened, **Then** it is reported as available with a large-run availability state rather than unreadable.
2. **Given** a large run, **When** the investigator opens it, **Then** they receive overview metrics and a newest-first page of requests.

---

### User Story 2 - Keep normal runs unchanged (Priority: P2)

An investigator continues to receive the existing full dashboard experience for normal-sized runs.

**Why this priority**: The new path must not regress existing captures or dashboard contracts.

**Independent Test**: Existing run and dashboard contract tests pass without changing their expected full-detail response shape.

### Edge Cases

- Malformed JSONL reports the line number and remains unavailable.
- An event file that is being appended during a read produces a valid page from complete lines already observed.
- Invalid, expired, or cross-run page cursors return a clear invalid-request response.
- Runs with usage facts but no artifacts remain pageable.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST parse canonical JSONL incrementally without constructing a whole-file string.
- **FR-002**: The session index MUST summarize large runs with bounded memory and identify them as large but available.
- **FR-003**: The session index MUST retain its existing normal-run behavior.
- **FR-004**: Stored content MUST continue to honor existing privacy modes.

### Key Entities

- **Run scan summary**: Bounded-memory facts derived from a run, including size, event counts, request usage totals, and availability.
- **Large-run availability**: A privacy-safe, bounded-memory session-list status with basic totals.

## Success Criteria

- **SC-001**: A 1 GB+ captured session can appear in the session list and return its initial request page without a whole-file string allocation.
- **SC-002**: Existing normal-run dashboard tests continue to pass.

## Assumptions

- Large historical JSONL captures remain the source of truth; no destructive migration is required.
- Request and artifact drilldown are separately specified follow-on features.
- The dashboard API remains local and read-only.
