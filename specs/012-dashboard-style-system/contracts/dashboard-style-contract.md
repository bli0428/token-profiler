# Contract: Dashboard Style System

## Purpose

The dashboard style system defines how the isolated dashboard app owns, organizes, validates, and evolves styling after spec 008. It prevents `dashboard/src/styles/app.css` from becoming a long-lived catch-all file while preserving dashboard isolation.

## Dependency Contract

This feature depends on spec 008 completion:

- `dashboard/` exists as a top-level app.
- `dashboard/package.json` owns dashboard scripts and dependencies.
- `dashboard/src/styles/app.css` or an equivalent dashboard style entry exists.
- Spec 008 fixture-backed UI tests are available or can be extended.

Implementation must not begin until those conditions are true.

## Scope Boundary

Allowed implementation paths:

```text
dashboard/
dashboard/src/
dashboard/src/styles/
dashboard/src/test/
dashboard/README.md
dashboard/package.json
```

Forbidden paths:

```text
AGENTS.md
.specify/feature.json
src/
specs/001-*
specs/002-*
specs/003-*
specs/004-*
specs/005-*
specs/006-*
specs/007-*
specs/008-*
specs/009-*
specs/010-*
specs/011-*
```

No implementation task may require modifying another spec directory.

## Style Entry Contract

`dashboard/src/styles/app.css` remains the dashboard stylesheet entrypoint unless implementation adopts an equivalent documented entrypoint.

Required import order:

1. Tokens
2. Base rules
3. Layout primitives
4. Shared states
5. Privacy and caveat states
6. Component or feature styles

Rules:

- The entrypoint may contain only import order comments and minimal app-shell global rules.
- The entrypoint must not contain table, detail, sessions, filter, or one-off component rules after migration.
- Imports must be dashboard-local.

## Token Contract

Dashboard tokens must include:

- Surface and text colors.
- Border, focus, warning, danger, success, and neutral state colors.
- Privacy and caveat state tokens.
- Spacing scale.
- Typography scale.
- Radius and border tokens.
- Responsive breakpoints.
- z-index layers.

Rules:

- Tokens are CSS custom properties or an equivalent dashboard-owned style primitive.
- Tokens must not be imported from root styles.
- Tokens must not carry analyzer or provider-specific meaning.

## Component Style Ownership

Required ownership areas:

- Sessions and session metadata.
- Run overview and task groups.
- Filters, search, sort, refresh, and toolbar controls.
- Artifact table, rows, metrics, selection, and empty results.
- Artifact detail panel, metadata sections, relationships, and caveats.
- Shared loading, empty, offline, stale, partial, not-found, retry, focus, disabled, and selected states.
- Shared privacy/caveat states.

Rules:

- Component styles reuse tokens and shared state/privacy styles.
- Broad descendant selectors and root-level overrides require a nearby comment explaining scope.
- Styling must not change dashboard data derivation or privacy behavior.

## Root Style Isolation

Forbidden dashboard CSS imports include:

```text
../src/*
../../src/*
../../../src/*
src/*
/Users/*/TokenEfficiencyTracker/src/*
../specs/*
../../specs/*
```

Equivalent relative traversal into root source, generated static dashboard output, or other spec directories is also forbidden.

## Validation Contract

Dashboard validation must cover:

- CSS import boundary checks.
- Broad global selector or catch-all rule checks.
- Rendering checks for shared state and privacy classes.
- Representative visual or screenshot checks when practical.

Required representative states:

- Normal sessions and selected run.
- Empty sessions or empty artifact results.
- Offline API.
- Version mismatch.
- Metadata-only or hidden content.
- Partial or stale data.
- Large artifact table.
- Artifact detail panel.

Validation must run from dashboard-owned commands and use deterministic fixtures.
