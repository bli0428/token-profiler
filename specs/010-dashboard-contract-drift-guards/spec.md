# Feature Specification: Dashboard Contract Drift Guards

**Feature Branch**: `010-dashboard-contract-drift-guards`

**Created**: 2026-06-26

**Status**: Superseded by expanded spec 008; retained as an audit reference

**Input**: User description: "Create a follow-up feature spec that prevents drift between the isolated dashboard frontend's duplicated API types and the real 007 dashboard API contract."

**Supersession Note**: The implementation-critical guardrails from this spec have been folded into `specs/008-dashboard-frontend-app` so they are built from the start. This document is retained only as a future audit/reference checklist.

## User Scenarios & Testing

### User Story 1 - Detect Dashboard Contract Drift (Priority: P1)

A maintainer can run a guard that compares the isolated dashboard frontend's duplicated API expectations against real responses from the completed dashboard API.

**Why this priority**: The frontend intentionally duplicates API-facing types to preserve isolation, so fixture-backed drift checks are the safety mechanism that keeps duplicated contracts honest.

**Independent Test**: Generate API-real baseline fixtures from a completed spec 007 dashboard API and run dashboard frontend contract tests that consume those fixtures without importing root `src/`.

**Acceptance Scenarios**:

1. **Given** spec 007 and spec 008 are complete, **When** the maintainer runs the fixture generation command against the local dashboard API, **Then** baseline fixtures are produced for status, sessions, run view, and artifact detail responses.
2. **Given** generated baseline fixtures exist, **When** the dashboard frontend contract tests run, **Then** the tests validate the duplicated dashboard API types and client parsing behavior using fixture JSON files only.
3. **Given** the API response shape changes incompatibly, **When** the dashboard fixture tests run, **Then** the tests fail before the dashboard renders misleading data.
4. **Given** dashboard source is inspected, **When** contract guard tests are reviewed, **Then** dashboard source still imports no root `src/` modules.

---

### User Story 2 - Preserve Privacy And Edge Behavior Fixtures (Priority: P1)

A maintainer can validate edge cases that are easy to break across API and frontend changes, including metadata-only privacy, structured errors, empty states, partial runs, stale runs, and unsupported versions.

**Why this priority**: Contract compatibility is not only field shape; the dashboard must keep privacy and error semantics stable.

**Independent Test**: Run fixture tests covering normal API-real baselines plus edge fixture variants with no live API process.

**Acceptance Scenarios**:

1. **Given** metadata-only or hidden-content fixtures, **When** dashboard tests render them, **Then** no hidden raw prompt, command output, patch, file content, or message body appears.
2. **Given** not-found, unreadable, partial, stale, and empty fixtures, **When** dashboard tests consume them, **Then** the correct local error or empty state is displayed.
3. **Given** an unsupported schema-version fixture, **When** dashboard tests consume it, **Then** the dashboard refuses to render the payload as valid data.
4. **Given** edge fixtures are reviewed, **When** their source is inspected, **Then** they are safe standalone JSON or dashboard-owned fixture data and do not depend on local private run files.

---

### User Story 3 - Keep Baselines Reviewable Over Time (Priority: P2)

A maintainer can intentionally refresh API-real fixtures and review the resulting contract changes before accepting them.

**Why this priority**: The guard should help maintainers notice real contract evolution instead of silently updating frontend expectations.

**Independent Test**: Regenerate fixtures from a known fixture run and verify the generated output is deterministic enough for code review.

**Acceptance Scenarios**:

1. **Given** the same fixture run and API implementation, **When** baseline fixtures are regenerated, **Then** stable fields remain unchanged except for documented generated timestamps or normalized volatile metadata.
2. **Given** fixture output changes, **When** the maintainer reviews the diff, **Then** endpoint, schema version, privacy state, caveat, and field-shape changes are visible.
3. **Given** dashboard tests consume refreshed fixtures, **When** they pass, **Then** the duplicated frontend contract is aligned with the accepted API behavior.

### Edge Cases

- Spec 007 is not implemented or not passing yet.
- Spec 008 dashboard app is not complete yet.
- The fixture generation command cannot find a suitable run or artifact ID.
- API responses include volatile timestamps or local-only labels.
- Empty sessions make it impossible to discover a run for baseline generation.
- Generated fixtures accidentally include hidden raw content.
- Structured errors differ from successful response envelopes.
- Frontend tests accidentally import root `src/` helpers while validating fixtures.
- Baseline fixtures are refreshed from real private local data rather than safe fixture runs.

## Requirements

### Functional Requirements

- **FR-001**: This feature MUST be implemented only after spec 007 dashboard API surface and spec 008 isolated dashboard frontend app are complete.
- **FR-002**: The system MUST provide API-real baseline fixtures generated from actual `GET /api/status`, `GET /api/sessions`, `GET /api/runs/:runId`, and `GET /api/runs/:runId/artifacts/:artifactId` responses.
- **FR-003**: Baseline fixture generation MUST use a safe known fixture run or explicitly documented local test data and MUST avoid private raw content.
- **FR-004**: The dashboard frontend tests MUST consume generated fixture JSON without importing root `src/`.
- **FR-005**: The dashboard frontend MUST keep duplicated API-facing types isolated from root API implementation types.
- **FR-006**: Contract tests MUST fail when required status, sessions, run, artifact detail, envelope, schema-version, caveat, privacy, or structured-error fields drift incompatibly.
- **FR-007**: Edge fixtures MUST cover empty sessions, not-found run, not-found artifact, unreadable run, partial or stale run, metadata-only privacy, hidden content, large run shape, and unsupported schema version.
- **FR-008**: Fixture validation MUST verify that metadata-only and hidden fixtures contain zero hidden raw prompt, command output, patch, file-content, or message bodies.
- **FR-009**: Fixture generation MUST normalize or document volatile fields so regenerated baseline diffs are reviewable.
- **FR-010**: Fixture capture MUST use documented HTTP endpoints and MUST NOT require dashboard code to import root API implementation types, mappers, analyzers, stores, or helpers.
- **FR-011**: The guard MUST document the exact commands for generating fixtures and running dashboard contract tests.
- **FR-012**: Existing spec 008 fixture tests MUST remain valid; this feature adds API-real drift coverage rather than replacing frontend behavior fixtures.

### Key Entities

- **DashboardContractBaselineFixtureSet**: Generated API-real JSON responses for status, sessions, selected run, and selected artifact detail.
- **DashboardContractEdgeFixtureSet**: Curated edge responses for privacy, errors, empty data, partial data, stale data, large data, and unsupported versions.
- **DashboardContractFixtureGenerator**: Root/API-side command or helper that requests the real local API and writes normalized fixture files.
- **DashboardContractFixtureConsumer**: Dashboard-owned tests that load fixture JSON and validate frontend parsing/rendering without root imports.
- **DashboardContractDriftReport**: Test output or review diff that identifies incompatible changes between API-real fixtures and dashboard expectations.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A maintainer can regenerate all API-real baseline fixtures from a local completed dashboard API with one documented command.
- **SC-002**: Dashboard contract tests fail when `schema_version` is missing or unsupported in any successful fixture.
- **SC-003**: Dashboard contract tests fail when required fields for status, sessions, run view, or artifact detail are removed or renamed.
- **SC-004**: Privacy validation confirms zero hidden raw content values appear in metadata-only and hidden edge fixtures.
- **SC-005**: Contract tests run without a live API process after fixtures have been generated.
- **SC-006**: Import-boundary checks continue to fail any dashboard source import from root `src/`.
- **SC-007**: Regenerating fixtures from unchanged safe fixture data produces reviewable diffs limited to normalized or documented volatile fields.

## Assumptions

- Spec 007 defines and implements the real dashboard API contract before this feature starts.
- Spec 008 defines and implements the isolated dashboard frontend before this feature starts.
- The dashboard frontend deliberately duplicates small API-facing TypeScript types.
- Safe API fixture data can be produced from test runs that do not contain private raw content.
- This feature is post-008 work and does not modify the feature scopes of specs 007 or 008.
