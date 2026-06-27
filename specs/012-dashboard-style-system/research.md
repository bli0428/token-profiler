# Research: Dashboard Style System

## Decision: Defer implementation until spec 008 is complete

**Rationale**: This feature reorganizes the dashboard app created by spec 008. Starting before 008 would force guesses about actual components, fixtures, and styles.

**Alternatives considered**:

- Build a parallel style system now: rejected because it may not match the implemented dashboard.
- Modify spec 008 tasks directly: rejected because this is an explicit follow-up feature.

## Decision: Keep all styling source under `dashboard/`

**Rationale**: Spec 008 establishes the dashboard as an isolated top-level app. The style system must preserve that package boundary and remain removable with the dashboard folder.

**Alternatives considered**:

- Share root CSS variables: rejected because root style leakage weakens isolation.
- Move styling to root `src/surfaces/dashboard/`: rejected because it couples the app to legacy static dashboard code.

## Decision: Split styles by responsibility before component count grows

**Rationale**: A single `app.css` starts simple but becomes a debt magnet as sessions, run explorer, artifact table, detail panel, privacy states, and caveats grow. Responsibility-focused files make ownership reviewable.

**Alternatives considered**:

- Keep one global CSS file: rejected because it hides ownership and makes regressions harder to review.
- Adopt a large design-system package: rejected as too heavy for a local dashboard follow-up.

## Decision: Use dashboard-owned design tokens

**Rationale**: Tokens for color, spacing, typography, borders, focus, z-index, and breakpoints keep visual decisions consistent without importing external root styles.

**Alternatives considered**:

- Hard-code values in every component file: rejected because consistency and state semantics would drift.
- Generate tokens from another package: rejected because no shared style package exists and dashboard isolation matters more now.

## Decision: Treat privacy and caveat styles as shared state primitives

**Rationale**: Hidden, metadata-only, unavailable, uncaptured, partial, stale, raw-available, and caveat states are core dashboard semantics. They should not be restyled differently in each component.

**Alternatives considered**:

- Let each component choose local privacy styling: rejected because inconsistent privacy presentation can mislead users.
- Encode privacy meaning in color alone: rejected because states must remain distinguishable and accessible.

## Decision: Add automated boundary and visual coverage

**Rationale**: The main long-term risk is unowned global CSS and accidental imports from root styles. Automated checks can catch those problems before review. Screenshot checks are useful for dense operational UI states when deterministic fixtures are available.

**Alternatives considered**:

- Rely on manual review: rejected because style regressions are easy to miss.
- Require pixel-perfect tests for all screens: rejected because that would be brittle and costly for early dashboard iteration.
