# Tasks: Consistent Capture Records And Privacy Modes

**Input**: Design documents from `/specs/001-canonical-event-schema-privacy/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/event-records.md`, `contracts/legacy-mvp-import.md`

**Tests**: Required for event construction, privacy modes, legacy import, and report documentation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other tasks that touch different files
- **[Story]**: Maps to user stories in `spec.md`

## Phase 1: Foundation

- [X] T001 [P] Add event record constructors and validation helpers in `src/events.js`
- [X] T002 [P] Add privacy-mode policy helpers in `src/privacy.js`
- [X] T003 [P] Add new event contract fixtures in `test/fixtures/events/`
- [X] T004 Add artifact and usage event validation tests in `test/events.test.js`
- [X] T005 Add privacy-mode behavior tests in `test/privacy.test.js`

---

## Phase 2: User Story 1 - Understand What Was Captured (P1)

**Goal**: Captured requests and items have a consistent documented shape.

**Independent Test**: Synthetic artifact and usage events validate and summarize correctly.

- [X] T006 [US1] Update `src/profiler.js` to create artifact events through `src/events.js`
- [X] T007 [US1] Update request usage event creation in `src/proxy.js` to use event constructors
- [X] T008 [US1] Update new event readers to require the new event contract
- [X] T009 [US1] Add regression tests proving new contract fixture runs summarize

---

## Phase 2A: Legacy MVP Import Boundary

**Goal**: Existing MVP files remain usable without weakening the new contract.

**Independent Test**: A legacy fixture imports into new event records before analysis.

- [X] T010 [P] Add legacy MVP fixtures in `test/fixtures/legacy-events/`
- [X] T011 Add `src/legacy-import.js` to map legacy artifact events into new artifact events
- [X] T012 Add tests proving missing `event_kind`, `token_count`, and missing `storage_mode` are handled only by the legacy importer
- [X] T013 Update CLI/read path to route legacy files through the importer before analysis, keeping legacy acceptance out of new event readers

---

## Phase 3: User Story 2 - Choose Local Retention Level (P1)

**Goal**: Metadata, preview, and raw-content modes are explicit and enforced.

**Independent Test**: Same synthetic content produces different stored fields in each mode.

- [X] T014 [US2] Replace `storeContent` boolean plumbing with explicit storage mode values for new captures
- [X] T015 [US2] Implement metadata-only behavior with `storage_mode: "metadata"` and no `content`/`preview`
- [X] T016 [US2] Implement preview mode with bounded `preview` and no `content`
- [X] T017 [US2] Preserve raw-content mode with `storage_mode: "raw"` and explicit `content`
- [X] T018 [US2] Add CLI help text and proxy startup output that names the active storage mode

---

## Phase 4: User Story 3 - Add New Captured Item Types Safely (P2)

**Goal**: New item metadata can be added without breaking older reports.

**Independent Test**: Unknown metadata is preserved and ignored safely by existing analyzers.

- [X] T019 [P] [US3] Add metadata variant tests for command, command output, patch, and unknown metadata
- [X] T020 [US3] Update aggregation metadata merging to preserve unknown fields and prefer more specific display names
- [X] T021 [US3] Add documentation comments or README section describing metadata extension rules

---

## Phase 5: Documentation And Verification

- [X] T022 Add user-facing note to `README.md`: "Local artifact attribution is estimated based on local tokenizer counts."
- [X] T023 Run `npm test`
- [X] T024 Run `node src/cli.js demo` and summarize the demo run
- [X] T025 Review touched files for the 600-line responsibility-boundary guideline
