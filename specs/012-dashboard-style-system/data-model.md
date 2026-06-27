# Data Model: Dashboard Style System

## DashboardStyleEntry

Owns the dashboard stylesheet import order.

**Fields / state**:

- `entryFile`: `dashboard/src/styles/app.css`.
- `imports`: Ordered list of dashboard-owned style modules.
- `globalScope`: Minimal app-wide selectors allowed for dashboard root, base reset, focus, and CSS variables.

**Validation rules**:

- Imports only files under `dashboard/src/styles/`.
- Imports tokens before files that consume tokens.
- Does not import root styles, generated static dashboard styles, or files outside `dashboard/`.
- Remains small enough to act as an entrypoint, not a catch-all stylesheet.

## DashboardDesignTokens

Defines dashboard visual vocabulary.

**Fields**:

- `colors`: Surface, text, border, accent, warning, danger, success, neutral, and state colors.
- `spacing`: Reusable spacing steps for dense operational layouts.
- `typography`: Font family, sizes, weights, line heights, and tabular number treatment.
- `radius`: Border radius values.
- `shadow`: Minimal elevation values, if needed.
- `focus`: Focus ring and keyboard navigation tokens.
- `breakpoints`: Dashboard responsive thresholds.
- `zIndex`: Layering for sticky bars, panels, popovers, and overlays.

**Validation rules**:

- Tokens are dashboard-owned CSS custom properties.
- Tokens do not encode provider-specific or analyzer-specific logic.
- Privacy states are not identified by color alone.

## DashboardLayoutPrimitives

Defines reusable dashboard layout rules.

**Fields**:

- `appShell`: Overall viewport and navigation regions.
- `splitPane`: Session list, run explorer, and detail panel arrangements.
- `toolbar`: Filter and refresh control alignment.
- `panel`: Section framing for operational content.
- `grid`: Responsive metric and task layouts.
- `scrollRegion`: Table and detail scrolling behavior.

**Validation rules**:

- Layout primitives use stable dimensions or responsive constraints to prevent overlap.
- Primitives do not include component-specific data semantics.
- Mobile and desktop behavior is covered by tests or screenshots.

## DashboardStateStyles

Defines reusable visual states.

**Fields**:

- `loading`
- `empty`
- `offline`
- `versionMismatch`
- `stale`
- `partial`
- `notFound`
- `retry`
- `selected`
- `disabled`
- `focusVisible`

**Validation rules**:

- States remain consistent across sessions, run explorer, artifact table, and detail panel.
- States include accessible labels or non-color indicators where needed.
- Missing metrics remain visually unavailable, not silently zero.

## DashboardPrivacyStyles

Defines privacy and caveat visual treatment.

**Fields**:

- `hidden`
- `metadataOnly`
- `unavailable`
- `uncaptured`
- `rawAvailable`
- `partial`
- `stale`
- `attributionCaveat`
- `estimatedValue`

**Validation rules**:

- Styling does not reveal hidden raw content.
- Privacy and caveat states are visually distinguishable.
- Caveats stay visible near affected summaries, tables, and details.

## DashboardComponentStyles

Owns feature and component style modules.

**Fields**:

- `sessions`: Session list and session metadata styles.
- `runExplorer`: Overview, task groups, and main workspace styles.
- `filters`: Search, category, task, sort, and refresh control styles.
- `artifactTable`: Table density, row selection, sortable headers, metrics, and empty results.
- `artifactDetail`: Detail panel sections, relationships, metadata, and caveats.

**Validation rules**:

- Component styles target component-owned class names or module scopes.
- Component styles reuse tokens, layout primitives, and shared state/privacy classes.
- Broad descendant selectors require documented justification.

## DashboardStyleValidation

Represents automated checks for the style system.

**Fields**:

- `styleBoundaryCheck`: Fails on CSS imports outside `dashboard/`.
- `selectorDisciplineCheck`: Flags broad global selectors and unowned catch-all rules.
- `stateCoverageCheck`: Confirms representative dashboard states render expected classes or attributes.
- `visualCheck`: Optional screenshot or visual-regression validation for key fixture states.

**Validation rules**:

- Runs from `dashboard/package.json`.
- Uses deterministic fixtures, not live profiler data.
- Can be executed without modifying root package configuration.
