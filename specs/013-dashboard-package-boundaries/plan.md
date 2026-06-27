# Implementation Plan: Dashboard Package Boundaries

> Superseded by expanded spec 008. Retained as an audit/reference artifact; do not implement as a separate feature unless spec 008 is later split again.

**Branch**: `013-dashboard-package-boundaries` | **Date**: 2026-06-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/013-dashboard-package-boundaries/spec.md`

## Summary

After spec 008 is complete, tighten the dashboard package boundary so root orchestration, dashboard validation, Vite browser env naming, and dependency ownership are explicit. The dashboard package remains the owner of its build, typecheck, tests, dependencies, and import-boundary validation. Root scripts may optionally delegate to dashboard-owned commands, but root source and root TypeScript configuration must not include or import `dashboard/src`.

## Technical Context

**Language/Version**: TypeScript on Node.js 18+ for both root and dashboard packages.

**Primary Dependencies**: Existing root package dependencies remain root-owned. Dashboard frontend dependencies remain declared in `dashboard/package.json`.

**Storage**: None.

**Testing**: Dashboard-owned tests cover dashboard build/typecheck/test/import-boundary validation. Root validation covers root source independence from `dashboard/src`.

**Target Platform**: Local developer checkout with a completed spec 008 dashboard package.

**Project Type**: Boundary hardening across an existing root TypeScript project and a separate top-level dashboard package.

**Performance Goals**: Boundary checks should be fast enough to run during normal local validation.

**Constraints**: Do not begin until spec 008 is complete. Do not move dashboard source into root `src`. Do not add root source imports from the dashboard app. Do not make root `tsconfig` compile `dashboard/src`.

**Scale/Scope**: Clarify scripts, docs, env naming, dependency ownership, and validation. Do not add dashboard product features, API endpoints, analyzer logic, storage changes, or adapter changes.

## Constitution Check

- **Local-first observability**: Pass. The feature protects local dashboard development without remote services.
- **Privacy modes**: Pass by preserving dashboard app isolation from raw root internals.
- **Provider-agnostic insight**: Pass. No provider-specific payloads cross into surfaces.
- **Architecture boundaries**: Pass if root source stays independent and dashboard consumes only public contracts.
- **Explainability over raw numbers**: Not directly applicable.
- **Documentation separation**: Pass. Boundary contracts and validation rules are documented as planning artifacts.
- **Code organization**: Pass if scripts and tests stay with their owning package.

## Project Structure

### Documentation (this feature)

```text
specs/013-dashboard-package-boundaries/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── dashboard-package-boundary.md
├── tasks.md
└── checklists/
    └── requirements.md
```

### Source Code (future implementation after spec 008)

```text
dashboard/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
└── README.md

package.json
tsconfig.json
```

**Structure Decision**: Keep dashboard validation under `dashboard/`. Root files may only add optional orchestration or root independence checks that do not compile or import dashboard app source.

## Architectural Pass

Implementation should avoid these shortcuts:

- Do not include `dashboard/src` in root `tsconfig`.
- Do not import dashboard app code from root source.
- Do not import root `src` from dashboard source.
- Do not place frontend dependencies in the root package unless they are also root-owned.
- Do not use non-Vite browser env names for the API base URL.
- Do not make dashboard tests depend on root test setup.
- Do not begin before spec 008 has landed.

## Phase 0 Research

See [research.md](./research.md).

## Phase 1 Design

See [data-model.md](./data-model.md), [contracts/dashboard-package-boundary.md](./contracts/dashboard-package-boundary.md), and [quickstart.md](./quickstart.md).

## Post-Design Constitution Check

- **Local-first observability**: Pass. The dashboard remains a local package.
- **Privacy modes**: Pass. Root internals remain outside browser app imports.
- **Provider-agnostic insight**: Pass. Dashboard data still crosses through HTTP contracts.
- **Architecture boundaries**: Pass. Root orchestration is separate from dashboard package ownership.
- **Explainability over raw numbers**: Not directly applicable.
- **Documentation separation**: Pass. Contract rules are captured outside product prose.
- **Code organization**: Pass. Ownership is explicit at package and validation boundaries.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
