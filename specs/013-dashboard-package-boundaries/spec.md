# Feature Specification: Dashboard Package Boundaries

**Feature Branch**: `013-dashboard-package-boundaries`

**Created**: 2026-06-26

**Status**: Superseded by expanded spec 008; retained as an audit reference

**Input**: User description: "Remove ambiguity around root orchestration, dashboard-owned tests, Vite env naming, and package boundaries after 008."

**Supersession Note**: The implementation-critical package ownership, root orchestration, Vite environment, and package-boundary guardrails from this spec have been folded into `specs/008-dashboard-frontend-app` so they are built from the start. This document is retained only as a future audit/reference checklist.

## User Scenarios & Testing

### User Story 1 - Validate Dashboard Package Ownership (Priority: P1)

A maintainer can tell which package owns dashboard build, typecheck, tests, dependencies, and browser configuration without inspecting unrelated source.

**Why this priority**: The dashboard app from spec 008 is intended to stay independently buildable and removable. Unclear ownership invites accidental root coupling.

**Independent Test**: Review package scripts and docs after 008 is complete and verify dashboard validation is owned by `dashboard/package.json`.

**Acceptance Scenarios**:

1. **Given** spec 008 is complete, **When** dashboard validation commands are inspected, **Then** `dashboard/package.json` owns dashboard build, typecheck, and test scripts.
2. **Given** root scripts exist, **When** they reference dashboard validation, **Then** they only orchestrate dashboard-owned scripts and do not duplicate dashboard build or test logic.
3. **Given** dashboard dependencies are inspected, **When** frontend packages are listed, **Then** they are declared in `dashboard/package.json` rather than the root package.

---

### User Story 2 - Keep Root Source Independent (Priority: P1)

A maintainer can run root source checks knowing root TypeScript configuration and source imports do not include dashboard app code.

**Why this priority**: The architecture requires surfaces to remain separated from analyzers, adapters, store code, and package-specific browser app internals.

**Independent Test**: Run root typecheck and import-boundary validation and verify root `tsconfig` and root source never include or import `dashboard/src`.

**Acceptance Scenarios**:

1. **Given** root TypeScript configuration is inspected, **When** include/exclude paths are reviewed, **Then** root source compilation does not include `dashboard/src`.
2. **Given** root source is inspected, **When** imports are checked, **Then** no root source file imports the dashboard app.
3. **Given** dashboard import-boundary validation runs, **When** it checks dashboard source, **Then** validation remains owned by the dashboard package and prevents imports from root `src`.

---

### User Story 3 - Configure Browser API Origin Clearly (Priority: P2)

A dashboard contributor can configure the browser app API origin with the expected Vite environment name.

**Why this priority**: A single documented environment variable prevents mismatch between local development, tests, and build-time browser configuration.

**Independent Test**: Set `VITE_DASHBOARD_API_BASE_URL`, run the dashboard app validation from `dashboard/package.json`, and verify browser requests use that value.

**Acceptance Scenarios**:

1. **Given** the dashboard app starts, **When** `VITE_DASHBOARD_API_BASE_URL` is set, **Then** browser API requests use that base URL.
2. **Given** docs mention environment configuration, **When** a contributor searches for the API base URL name, **Then** only `VITE_DASHBOARD_API_BASE_URL` is documented for browser builds.
3. **Given** legacy or ambiguous names are present, **When** validation runs, **Then** they are rejected or documented as unsupported.

### Edge Cases

- Root scripts may optionally call dashboard scripts for convenience, but the dashboard package remains authoritative.
- Root package installation must not be required for dashboard-only validation beyond repository checkout.
- Dashboard package installation must not be required for root source typecheck unless a root orchestration script explicitly opts into dashboard validation.
- Root `tsconfig` must not grow includes, references, path aliases, or source dependencies that compile `dashboard/src`.
- Browser env variables without the `VITE_` prefix are not available to the Vite client and must not be treated as supported.
- Import-boundary checks must catch relative path escapes as well as package aliases.

## Requirements

### Functional Requirements

- **FR-001**: This feature MUST NOT begin implementation until spec 008 is complete.
- **FR-002**: Dashboard build, typecheck, test, preview, and import-boundary validation commands MUST be owned by `dashboard/package.json`.
- **FR-003**: Root package scripts MAY invoke dashboard-owned scripts for orchestration, but MUST NOT reimplement dashboard build, typecheck, test, or import-boundary logic.
- **FR-004**: Root `tsconfig` and root source checks MUST NOT include `dashboard/src`.
- **FR-005**: Root source MUST NOT import from the dashboard app package or `dashboard/src`.
- **FR-006**: Dashboard source MUST NOT import root `src`, analyzers, adapters, canonical store, CLI, or static dashboard internals.
- **FR-007**: Browser API base URL configuration MUST use `VITE_DASHBOARD_API_BASE_URL`.
- **FR-008**: Dashboard frontend dependencies MUST be declared in `dashboard/package.json`; root package dependencies MUST remain limited to root-owned code.
- **FR-009**: Any shared contract data used by the dashboard MUST cross the package boundary through HTTP contracts or explicitly generated public artifacts, never root internal imports.
- **FR-010**: Documentation MUST state which commands validate dashboard-only work and which optional root command invokes dashboard validation.
- **FR-011**: Validation MUST prove the dashboard package can be removed without breaking root source typecheck.

### Key Entities

- **DashboardPackageBoundary**: The ownership rule that `dashboard/` owns app source, dependencies, scripts, tests, and browser build configuration.
- **RootOrchestrationScript**: Optional root convenience command that delegates to dashboard-owned scripts without owning their implementation.
- **DashboardBrowserEnvContract**: The Vite-exposed configuration contract for `VITE_DASHBOARD_API_BASE_URL`.
- **DashboardImportBoundaryValidation**: Dashboard-owned validation that rejects imports from root `src` and other internal root modules.
- **RootSourceIndependenceCheck**: Validation that root source and root TypeScript configuration do not depend on `dashboard/src`.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A contributor can identify the dashboard-owned build, typecheck, test, and import-boundary commands from `dashboard/package.json` within two minutes.
- **SC-002**: Root typecheck completes without compiling files under `dashboard/src`.
- **SC-003**: Import-boundary validation fails when dashboard source imports root `src`.
- **SC-004**: Root source validation fails when root source imports `dashboard/src`.
- **SC-005**: Dashboard browser requests use `VITE_DASHBOARD_API_BASE_URL` in development and build validation.
- **SC-006**: Removing `dashboard/` does not require changes to root source for root source validation to pass.

## Assumptions

- Spec 008 has created the isolated `dashboard/` package and its initial validation commands.
- Spec 007 dashboard API contracts are already available to the app through HTTP.
- Root orchestration is convenience-only and is not required for dashboard-only development.
- No package workspace migration is required for this feature.
