# Data Model: Dashboard Package Boundaries

## DashboardPackageBoundary

Represents package-level ownership for the top-level dashboard app.

**Fields / state**:

- `packagePath`: `dashboard/package.json`.
- `ownedScripts`: Dashboard build, typecheck, test, preview, and import-boundary commands.
- `ownedDependencies`: Browser app dependencies declared by the dashboard package.
- `ownedSourceRoots`: Dashboard app source, tests, fixtures, styles, and config under `dashboard/`.

**Validation rules**:

- Dashboard validation commands are defined in `dashboard/package.json`.
- Dashboard frontend dependencies are not added to root package metadata unless root source also owns them.
- Dashboard package can be validated without importing root `src`.

## RootOrchestrationScript

Represents optional root convenience commands that call dashboard-owned scripts.

**Fields / state**:

- `scriptName`: Root script name.
- `delegatedCommand`: Command that invokes an existing dashboard package script.
- `requiredInstallScope`: Whether the command requires dashboard dependencies.

**Validation rules**:

- Root orchestration may call dashboard scripts but must not duplicate dashboard validation logic.
- Root source validation remains runnable without compiling `dashboard/src`.
- Root docs clearly distinguish root-only validation from all-package validation.

## DashboardBrowserEnvContract

Represents browser-visible dashboard API base URL configuration.

**Fields / state**:

- `apiBaseUrlEnvName`: `VITE_DASHBOARD_API_BASE_URL`.
- `defaultBaseUrl`: Local dashboard API default when the env variable is absent.
- `consumer`: Dashboard browser API client.

**Validation rules**:

- Browser app reads only `VITE_DASHBOARD_API_BASE_URL` for API origin override.
- Unsupported aliases are not documented as equivalent.
- Tests or fixtures can prove the configured base URL is used.

## DashboardImportBoundaryValidation

Represents dashboard-owned validation that protects the app from root internals.

**Fields / state**:

- `ownerPackage`: `dashboard`.
- `checkedPaths`: Dashboard source and test files.
- `forbiddenImports`: Root `src`, analyzers, adapters, canonical store, CLI, and static dashboard internals.

**Validation rules**:

- Relative imports escaping into root `src` fail.
- Aliased imports resolving to root internals fail.
- Validation command lives in `dashboard/package.json`.

## RootSourceIndependenceCheck

Represents validation that root source does not depend on dashboard app code.

**Fields / state**:

- `checkedPaths`: Root source and root TypeScript configuration.
- `forbiddenIncludes`: `dashboard/src`.
- `forbiddenImports`: Dashboard app package paths and relative imports into `dashboard/src`.

**Validation rules**:

- Root `tsconfig` does not include or reference dashboard app source.
- Root source imports from `dashboard/src` fail validation.
- Removing `dashboard/` does not break root source typecheck.
