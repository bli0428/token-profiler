# Contributing

Thanks for taking a look at Token Profiler. The project is still early, so the
best contributions are the ones that make the local capture, analysis, and
dashboard experience easier to understand, safer to run, or simpler to extend.

## Start Here

Before changing capture, analyzer, storage, or surface code, read:

- [Architecture](docs/architecture.md)
- [Privacy And Trust](docs/privacy-and-trust.md)

Those docs are the source of truth for module boundaries, capture modes, local
storage, and network behavior.

## Local Setup

Use Node.js 18 or newer.

```bash
npm install
cd dashboard
npm install
```

Run root checks from the repository root:

```bash
npm run typecheck
npm test
```

Run dashboard checks from `dashboard/`:

```bash
npm run typecheck
npm test
```

For dashboard development with hot reloading:

```bash
cd dashboard
VITE_DASHBOARD_API_BASE_URL=http://127.0.0.1:8788 npm run dev -- --host 127.0.0.1 --port 5173
```

## Contribution Guidelines

- Keep changes scoped to the layer you are working in.
- Define explicit owned types at module and public contract boundaries.
- Map fields by name when data crosses a layer boundary.
- Avoid object spreading across public contracts when it would make contract
  changes implicit.
- Preserve privacy behavior when adding new artifact metadata, previews, or raw
  content paths.
- Add or update focused tests when behavior changes.
- Update docs when commands, storage locations, capture modes, or dashboard API
  behavior changes.

## Pull Requests

A good PR usually includes:

- a short explanation of the problem and the chosen approach
- notes about any architecture or privacy boundary touched
- tests or a clear reason tests were not changed
- docs updates for user-visible behavior

Small, focused PRs are preferred.
