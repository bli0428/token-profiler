# Implementation Plan: Codex Session Dashboard Grouping

**Branch**: `017-codex-session-dashboard-grouping` | **Date**: 2026-06-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/017-codex-session-dashboard-grouping/spec.md`

## Summary

Make the dashboard visibly honor Codex-session grouping for new traffic captured after the proxy restart. The dashboard consumes upstream session identity fields from the dashboard API contract, renders one selectable row per API session group, labels true Codex-session grouping distinctly from fallback grouping, and keeps request drilldown scoped to the selected row's run id.

## Technical Context

**Language/Version**: TypeScript with React 19 in `dashboard/`; root TypeScript/Node.js 18+ for dashboard API contract tests.

**Primary Dependencies**: Existing dashboard stack (`react`, `react-dom`, `vite`, `vitest`, Testing Library). No new runtime dependency.

**Storage**: No new storage. The dashboard reads local dashboard API JSON derived from canonical run data.

**Testing**: Root `npm run typecheck`; targeted root `node --import tsx --test` tests for dashboard API session identity; dashboard `npm run typecheck` and `npm test`/targeted Vitest for React behavior.

**Target Platform**: Local dashboard in modern desktop browsers, with existing responsive behavior preserved.

**Project Type**: Frontend dashboard surface over a local dashboard API.

**Performance Goals**: Session lists and request drilldown remain instant at fixture scale; labeling must not add extra API round trips or browser-side identity derivation.

**Constraints**: Preserve `Adapters -> Canonical Store -> Analyzers -> Surfaces`. Dashboard code must not parse Codex request payloads, prompt cache keys, headers, or raw provider metadata to infer grouping. It renders `identity` fields and fetches selected run details by `run_id`.

**Scale/Scope**: Dashboard-only UI/API contract validation. No adapter changes, analyzer algorithm changes, migrations, historical backfill, or proxy restart automation.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Local-first observability**: Pass. The feature operates on the local dashboard API and local fixture data.
- **Privacy modes**: Pass if session labels and request drilldown do not expose raw content and reuse existing privacy rendering.
- **Provider-agnostic insight**: Pass. Provider-specific identity handling remains upstream; dashboard renders normalized identity confidence/source.
- **Architecture boundaries**: Pass if dashboard code consumes API-owned session identity and does not recompute Codex identity from provider payloads.
- **Explainability over raw numbers**: Pass. The visible grouping label explains why a row is or is not a true Codex session group.
- **Documentation separation**: Pass. Spec stays user-value focused; implementation details live in this plan and task list.
- **Code organization**: Pass if label rendering stays in session-list presentation and selection behavior remains in dashboard state/client code.

## Project Structure

### Documentation (this feature)

```text
specs/017-codex-session-dashboard-grouping/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── session-dashboard-grouping.md
├── tasks.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
dashboard/src/
├── api/
│   └── types.ts
├── sessions/
│   └── SessionList.tsx
├── shell/
│   └── DashboardController.tsx
├── state/
│   └── reconcile.ts
├── styles/
│   └── sessions.css
└── test/
    ├── session-list.test.tsx
    └── shell-controller.test.tsx

src/surfaces/dashboard-api/
├── sessions.ts
└── types.ts

test/
├── codex-sessions.test.js
└── dashboard-api-request-accounting.test.js
```

**Structure Decision**: Implement this as a dashboard surface and API-contract validation change. The surface renders normalized identity metadata and uses existing selected-run routing. Upstream canonical/session routing work remains in spec 016 and is not extended here.

## Phase 0 Research

See [research.md](./research.md).

## Phase 1 Design

See [data-model.md](./data-model.md), [contracts/session-dashboard-grouping.md](./contracts/session-dashboard-grouping.md), and [quickstart.md](./quickstart.md).

## Post-Design Constitution Check

- **Local-first observability**: Pass. Validation uses local fixtures and local dashboard tests.
- **Privacy modes**: Pass. No new raw-content display path is introduced.
- **Provider-agnostic insight**: Pass. Browser code renders normalized identity fields instead of provider-specific payloads.
- **Architecture boundaries**: Pass. Dashboard remains a surface consuming API contract fields.
- **Explainability over raw numbers**: Pass. Grouping labels explain session identity confidence/source.
- **Documentation separation**: Pass. Specification remains behavior-focused; technical details are in plan/design/tasks.
- **Code organization**: Pass. Changes are confined to session list display, dashboard selection verification, and contract tests.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
