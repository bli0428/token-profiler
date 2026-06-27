# Research: Dashboard Package Boundaries

## Decision: Treat spec 013 as post-008 boundary hardening

**Rationale**: Spec 008 creates the isolated dashboard app. This follow-up should not redefine that product work; it should clarify ownership rules after the app exists.

**Alternatives considered**:

- Fold these rules into spec 008: rejected because 008 may already be in flight and this work is explicitly deferred.
- Implement boundary changes before 008: rejected because the concrete dashboard package scripts and files may not exist yet.

## Decision: Dashboard package owns dashboard validation

**Rationale**: Build, typecheck, test, preview, and import-boundary commands are part of the frontend package contract. Keeping them in `dashboard/package.json` lets dashboard contributors validate work without root package coupling.

**Alternatives considered**:

- Move dashboard validation into root scripts only: rejected because root would become the owner of dashboard behavior.
- Duplicate validation logic in both packages: rejected because drift would make failures ambiguous.

## Decision: Root scripts may only orchestrate dashboard scripts

**Rationale**: A root convenience command can help CI or maintainers run all checks, but it must delegate to dashboard-owned commands.

**Alternatives considered**:

- Forbid all root references to dashboard scripts: too strict for repository-level validation.
- Make root validation always install and test dashboard: rejected because root-only contributors should not need dashboard dependencies for root source checks.

## Decision: Use `VITE_DASHBOARD_API_BASE_URL` for browser API origin

**Rationale**: Vite exposes browser environment variables with a `VITE_` prefix. A single explicit name avoids confusion between server-side and browser-side configuration.

**Alternatives considered**:

- Use `DASHBOARD_API_BASE_URL`: rejected because it is not exposed to Vite browser code by default.
- Support several aliases: rejected because aliases obscure which value wins.

## Decision: Validate both directions of import independence

**Rationale**: Spec 008 protects dashboard source from importing root internals. This follow-up also protects root source from depending on dashboard app code.

**Alternatives considered**:

- Only check dashboard imports: insufficient because root source could still become coupled to the app.
- Rely on TypeScript project references: insufficient unless configured to exclude all relative import escapes.
