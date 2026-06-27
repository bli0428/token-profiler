# Data Model: Current Dashboard Surface Cleanup

## DashboardSurfaceInventory

Represents the modules, commands, tests, and docs involved in the old dashboard surface.

**Fields**:

- `retainedModelModules`: `src/surfaces/dashboard/model.ts`, `privacy.ts`, `sessions.ts`, and `types.ts`.
- `removedRendererModules`: `src/surfaces/dashboard/assets.ts`, `render.ts`, and `src/surfaces/html-report.ts`.
- `removedCliCommands`: old static `html` and `dashboard` command dispatch.
- `retainedCliCommands`: `dashboard-api serve`, `summarize`, `legibility`, `explain`, `sessions`, proxy, capture, and import commands.
- `updatedDocs`: README and CLI help text.

**Validation rules**:

- Retained model modules must not import frontend `dashboard/` code.
- Removed renderer modules must have no live imports.
- CLI help must not advertise static dashboard HTML generation.

## DashboardCompatibilityDecision

Represents the user-facing choice for old static dashboard behavior.

**Fields**:

- `staticHtmlCommand`: removed from supported CLI help and dispatch.
- `staticSessionIndexCommand`: removed from supported CLI help and dispatch.
- `supportedDashboardPath`: start the local dashboard API and run the isolated dashboard app.
- `existingGeneratedFiles`: left on disk; no migration.

**Validation rules**:

- Unknown old commands should fail through normal CLI error behavior, not silently generate stale files.
- Documentation must point users at `dashboard-api serve` and dashboard package commands.

## DashboardCleanupResult

Represents the completed cleanup state.

**Fields**:

- `removedFiles`: Static renderer and HTML report files removed.
- `updatedImports`: Root exports and CLI imports no longer reference removed files.
- `updatedTests`: Static renderer tests removed or replaced with API/model/cleanup coverage.
- `validationEvidence`: Root test/typecheck results and dashboard package status when available.

**Validation rules**:

- Dashboard API behavior remains unchanged.
- Metadata-only and hidden raw content still do not leak through dashboard-facing API/model responses.
- Non-dashboard CLI workflows remain available.
