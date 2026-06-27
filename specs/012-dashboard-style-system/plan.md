# Implementation Plan: Dashboard Style System

> Superseded by expanded spec 008. Retained as an audit/reference artifact; do not implement as a separate feature unless spec 008 is later split again.

**Branch**: `012-dashboard-style-system` | **Date**: 2026-06-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/012-dashboard-style-system/spec.md`

## Summary

After spec 008 is complete, audit dashboard styling so the app continues to avoid one expanding `dashboard/src/styles/app.css`. Keep all implementation under `dashboard/`: a documented style entrypoint, shared design tokens, base rules, layout primitives, state/privacy/caveat styles, component or feature style modules, validation tests, and optional screenshot or visual-regression checks for representative dashboard states.

This feature does not change root source, dashboard API contracts, analyzers, capture, storage, or other specs. It is deferred post-008 work and assumes the dashboard app already exists.

## Technical Context

**Language/Version**: TypeScript on Node.js 18+ with browser-targeted frontend TypeScript from spec 008.

**Primary Dependencies**: Reuse the dashboard package dependencies from spec 008. Add dashboard-owned style validation or browser screenshot tooling only if not already available and only under `dashboard/package.json`.

**Storage**: No persistence changes.

**Testing**: Dashboard-owned tests for stylesheet boundaries, selector discipline, state rendering, responsive layout, and visual checks when practical. Reuse spec 008 fixtures for normal, empty, large, offline, version mismatch, metadata-only, partial, stale, and detail states.

**Target Platform**: Local developer browser through the dashboard Vite app.

**Project Type**: Follow-up styling architecture inside the top-level dashboard application.

**Performance Goals**: Style reorganization must not visibly slow dashboard rendering or large-table interaction from spec 008 goals.

**Constraints**: All source changes must stay under `dashboard/`. Dashboard styles must not import root CSS, root `src/`, generated static dashboard output, or files from other spec directories. Styling must not recompute analyzer facts or change privacy semantics.

**Scale/Scope**: Split CSS by responsibility, define tokens and primitives, migrate component/state styles, document style ownership, and add validation. Do not redesign the product, change API data, or clean up legacy static dashboard code.

## Constitution Check

- **Local-first observability**: Pass. Styling remains local dashboard UI work.
- **Privacy modes**: Pass if hidden, metadata-only, unavailable, uncaptured, partial, stale, and caveat states remain visually distinct and no hidden content is introduced.
- **Provider-agnostic insight**: Pass. Styling consumes rendered dashboard data and does not depend on provider payloads.
- **Architecture boundaries**: Pass if all changes stay under `dashboard/` and dashboard imports no root styles or source files.
- **Explainability over raw numbers**: Pass. Caveat and privacy presentation receives first-class shared styling.
- **Documentation separation**: Pass. Style contracts and ownership live in this feature's planning artifacts and dashboard docs.
- **Code organization**: Pass if styles are split by tokens, base, layout, states, privacy, and component responsibility.

## Project Structure

### Documentation (this feature)

```text
specs/012-dashboard-style-system/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── dashboard-style-contract.md
├── tasks.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

Planned implementation is constrained to `dashboard/` after spec 008 completes:

```text
dashboard/
├── package.json
├── src/
│   ├── App.tsx
│   ├── components/
│   │   ├── ArtifactDetailPanel.tsx
│   │   ├── ArtifactTable.tsx
│   │   ├── CaveatList.tsx
│   │   ├── EmptyState.tsx
│   │   ├── ErrorState.tsx
│   │   ├── FiltersBar.tsx
│   │   ├── RunOverview.tsx
│   │   ├── SessionList.tsx
│   │   └── TaskGroups.tsx
│   ├── styles/
│   │   ├── app.css
│   │   ├── tokens.css
│   │   ├── layout.css
│   │   ├── states.css
│   │   ├── sessions.css
│   │   ├── run-explorer.css
│   │   ├── tables.css
│   │   └── detail.css
│   └── test/
│       ├── style-boundary.test.ts
│       ├── style-states.test.tsx
│       └── visual-regression.test.tsx
└── README.md
```

**Structure Decision**: Keep `app.css` as a dashboard style entrypoint or minimal app-shell file. Shared files own tokens, layout, states, and privacy/caveat treatment. Feature files own sessions, run explorer, tables, and detail panels. If implementation chooses CSS Modules instead of imported CSS files, the same ownership boundaries must be preserved and documented.

## Architectural Pass

Implementation should avoid these shortcuts:

- Do not edit `AGENTS.md`, `.specify/feature.json`, root source, or any other spec directory.
- Do not import root styles or generated static dashboard CSS into `dashboard/`.
- Do not move dashboard styles into root `src/`.
- Do not use styling changes to recompute analyzer metrics, privacy state, task grouping, labels, or caveats.
- Do not hide caveats or make privacy states visually ambiguous.
- Do not create broad unowned selectors that style arbitrary descendants across the dashboard.
- Do not make screenshot checks depend on live profiler data.
- Do not redesign the dashboard beyond the style-system migration required here.

## Phase 0 Research

See [research.md](./research.md).

## Phase 1 Design

See [data-model.md](./data-model.md), [contracts/dashboard-style-contract.md](./contracts/dashboard-style-contract.md), and [quickstart.md](./quickstart.md).

## Post-Design Constitution Check

- **Local-first observability**: Pass. Validation runs locally in the dashboard package.
- **Privacy modes**: Pass. Privacy and caveat styles are explicit shared responsibilities.
- **Provider-agnostic insight**: Pass. No provider-specific styling contracts are introduced.
- **Architecture boundaries**: Pass. Source scope remains `dashboard/` only.
- **Explainability over raw numbers**: Pass. Visual treatment reinforces caveats and state explanation.
- **Documentation separation**: Pass. Style contract and quickstart define implementation expectations.
- **Code organization**: Pass. Style files map to responsibilities rather than one global file.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
