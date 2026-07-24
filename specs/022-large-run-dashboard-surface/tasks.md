# Tasks: Large Run Dashboard Surface

**Input**: Design documents from `/specs/022-large-run-dashboard-surface/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/large-run-dashboard-ui.md`, and `quickstart.md`

**Tests**: Required. The P1 independent test and explicit cursor/privacy requirements require dashboard client, controller, and explorer coverage using API-shaped data.

**Organization**: Tasks are grouped by user story. Features 019--021 already own the canonical streaming, analyzer, and dashboard API large-run endpoints; this feature consumes those public HTTP contracts only.

## Phase 1: Setup

**Purpose**: Establish API-shaped dashboard fixtures that can exercise bounded pages without importing server internals or embedding content.

- [X] T001 Create reusable large-run overview, request-page, and artifact-page response builders with opaque cursors and privacy-state-only artifact rows in `dashboard/src/test/large-run-explorer.test.tsx`

---

## Phase 2: Foundational prerequisites

**Purpose**: Lock the dashboard-owned transport boundary before the explorer consumes it. This phase blocks User Story 1.

- [X] T002 Define or align the mirrored `LargeRunResponse`, `LargeRunPage`, and `LargeRunArtifactPage` transport types with the dashboard API contract in `dashboard/src/api/types.ts`
- [X] T003 Implement or align typed `getLargeRun`, `getLargeRunRequests`, and `getLargeRunArtifacts` methods that URL-encode identifiers and forward optional cursors unchanged in `dashboard/src/api/client.ts`
- [X] T004 Add client request-path coverage for initial, request-continuation, and selected-request artifact-continuation calls without cursor decoding in `dashboard/src/test/api-client.test.ts`

**Checkpoint**: The dashboard has a typed, HTTP-only way to retrieve one bounded large-run overview, request page, or selected-request artifact page.

---

## Phase 3: User Story 1 — Explore an available large run (Priority: P1) 🎯 MVP

**Goal**: An investigator selecting an available large session sees a dedicated paged experience, can explicitly advance request/artifact pages, and sees only API-provided privacy/grouping facts.

**Independent Test**: Render a session marked `large_run_paged` with API-shaped first and continuation pages; verify the paged overview appears instead of the full-run explorer, each continuation forwards the returned opaque cursor unchanged, an artifact page stays scoped to its selected request, and no content/grouping/privacy field is browser-derived.

### Tests for User Story 1

- [X] T005 [P] [US1] Add interaction coverage for initial large-run loading, request-page replacement, selected-request artifact-page replacement, run-change resets, API errors, and returned privacy states in `dashboard/src/test/large-run-explorer.test.tsx`
- [X] T006 [P] [US1] Add controller regression coverage that selects `LargeRunExplorer` only for an API-provided `large_run_paged` caveat and preserves the normal `RunExplorer` path otherwise in `dashboard/src/test/shell-controller.test.tsx`

### Implementation for User Story 1

- [X] T007 [US1] Implement bounded large-run view state that resets on client/run changes, renders the API overview/request rows, replaces pages on continuation, and exposes safe loading/error states in `dashboard/src/run-explorer/LargeRunExplorer.tsx`
- [X] T008 [US1] Render artifact rows only from declared artifact-page fields, display `preview_state` as availability only, and prevent unavailable client actions from issuing requests in `dashboard/src/run-explorer/LargeRunExplorer.tsx`
- [X] T009 [US1] Select the dedicated paged explorer from the `large_run_paged` session caveat without requesting or rendering the normal full-run path for that selection in `dashboard/src/shell/DashboardController.tsx`
- [X] T010 [US1] Add responsive bounded request/artifact table and continuation-control styling without introducing full-run table assumptions in `dashboard/src/styles/tables.css` and `dashboard/src/styles/app.css`

**Checkpoint**: A large session can be explored through explicitly requested API pages, while a normal session retains its established full-run explorer.

---

## Phase 4: Polish and cross-cutting validation

**Purpose**: Document the changed dashboard public surface and verify the complete local workflow.

- [X] T011 [P] Update paged large-run usage, HTTP-only data ownership, and privacy/content exclusions in `dashboard/README.md`
- [X] T012 [P] Update the public large-run client methods, type ownership, cursor invariants, and forbidden dependencies in `dashboard/contract.md`
- [X] T013 Run the focused dashboard and dashboard-API commands from `specs/022-large-run-dashboard-surface/quickstart.md` and record results in that file

---

## Dependencies & Execution Order

```text
T001 -> T005
T002 -> T003 -> T004
T002 + T003 + T004 -> T005 + T006
T005 -> T007 -> T008
T006 + T008 -> T009 -> T010
T009 + T010 -> T011 + T012 -> T013
```

- **Setup (T001)** supplies safe, API-shaped fixture data for the explorer's independent test.
- **Foundational (T002--T004)** defines and proves the client transport boundary before UI work relies on it.
- **User Story 1 (T005--T010)** is the complete P1 slice and may begin after foundational work; T005/T006 can proceed in parallel because they touch distinct test files.
- **Polish (T011--T013)** follows the completed surface so documentation and validation match behavior.

## Parallel Opportunities

- T002 and T004 can be prepared in parallel once the API contract is reviewed, but T004 must validate the final client methods from T003.
- T005 and T006 can run in parallel after T001--T004: they cover the explorer and controller in separate files.
- T011 and T012 can run in parallel after the P1 implementation stabilizes because they document separate dashboard boundary documents.

## Parallel Example: User Story 1

```text
After T001--T004 complete:

Task: "Add large-run explorer continuation/reset/error coverage in dashboard/src/test/large-run-explorer.test.tsx"
Task: "Add normal-versus-large controller selection regression coverage in dashboard/src/test/shell-controller.test.tsx"
```

## Implementation Strategy

### MVP First

1. Complete T001--T004 to prove the dashboard transport boundary and fixture shape.
2. Complete T005, then implement T007--T009 until the P1 independent test passes.
3. Complete T008 and T010 to make the selected-request display safe and legible.
4. Validate the focused P1 workflow before documentation and final checks.

### Incremental Delivery

1. The dashboard client transparently consumes bounded large-run pages.
2. The dedicated explorer displays and pages API-owned request/artifact data.
3. Controller selection preserves the normal-run path.
4. Dashboard documentation and quickstart evidence preserve the surface boundary for future work.

## Notes

- All tasks preserve `Adapters -> Canonical Store -> Analyzers -> Surfaces`; the browser stays in the surface layer and consumes HTTP JSON only.
- Cursors remain API-owned and opaque. No task may decode, synthesize, persist, or cross-bind a cursor.
- No task may introduce browser-side grouping/privacy inference, JSONL access, provider payloads, preview/raw content delivery, full-run artifact accumulation, or a new server/cache layer.
