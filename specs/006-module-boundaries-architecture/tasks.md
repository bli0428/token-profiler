# Tasks: Module Boundaries And Architecture Migration

**Input**: Design documents from `/specs/006-module-boundaries-architecture/`

**Prerequisites**: `spec.md`, `plan.md`, `docs/architecture.md`

**Tests**: Required for import boundaries, legacy quarantine, and unchanged CLI/report behavior.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other tasks that touch different files
- **[Story]**: Maps to user stories in `spec.md`

## Phase 1: Architecture Documentation

- [X] T001 [US1] Add concise Hybrid Local Observability Core architecture doc in `docs/architecture.md`
- [X] T002 [US1] Reference architecture direction from `AGENTS.md`
- [X] T003 [US1] Add architecture boundary principle to `.specify/memory/constitution.md`
- [X] T004 [US1] Sequence `006` before substantial adapter/analyzer/dashboard work in `specs/README.md`

---

## Phase 2: Core Boundary Migration

- [X] T005 [US2] Move canonical event constructors and validators into `src/core/events/`
- [X] T006 [US2] Move privacy-mode policy helpers into `src/core/privacy/`
- [X] T007 [US2] Move JSONL store helpers into `src/core/store/`
- [X] T008 [US2] Keep top-level compatibility exports for existing imports

---

## Phase 3: Ingest And Legacy Boundary Migration

- [X] T009 [US2] Move legacy MVP import into an ingest-owned legacy boundary
- [X] T010 [US2] Move Codex proxy capture into `src/ingest/codex-proxy/`
- [X] T011 [US2] Preserve top-level proxy and legacy-import compatibility exports
- [X] T012 [US2] Add tests proving legacy event-field fallback is quarantined to the legacy importer

---

## Phase 4: Analysis And Surface Boundary Migration

- [X] T013 [US2] Move aggregate analysis into `src/analysis/`
- [X] T014 [US2] Move legibility analysis into `src/analysis/`
- [X] T015 [US3] Move CLI entrypoint logic into `src/surfaces/cli/`
- [X] T016 [US3] Keep `src/cli.js` as the stable executable wrapper

---

## Phase 5: Boundary Verification

- [X] T017 [US2] Add architecture boundary tests preventing analysis imports from ingest/surface modules
- [X] T018 [US2] Add tests ensuring top-level compatibility modules stay thin re-exports
- [X] T019 [US3] Run full test suite
- [X] T020 [US3] Run demo and summarize to verify CLI behavior
- [X] T021 [US3] Review large remaining modules against the 600-line responsibility guideline

---

## Phase 6: Internal Module Splitting

- [X] T022 [US2] Split Codex proxy capture into server, transport, recording, and artifact extraction modules
- [X] T023 [US2] Split CLI surface into dispatcher, capture commands, proxy/Codex commands, report commands, and shared utilities
- [X] T024 [US3] Verify all split modules stay below the 600-line responsibility guideline
- [X] T025 [US3] Rerun full test suite after internal module split
- [X] T026 [US3] Rerun demo and summarize after internal module split

---

## Phase 7: TypeScript Migration

- [X] T027 [US2] Add TypeScript, tsx, Node types, and `tsconfig.json`
- [X] T028 [US2] Convert core, ingest, analysis, and surface modules to `.ts`
- [X] T029 [US2] Keep top-level JavaScript compatibility wrappers and CLI executable stable
- [X] T030 [US2] Update test runtime to load TypeScript modules through `tsx`
- [X] T031 [US3] Run `npm run typecheck`
- [X] T032 [US3] Run full test suite after TypeScript migration
- [X] T033 [US3] Rerun demo and summarize after TypeScript migration
