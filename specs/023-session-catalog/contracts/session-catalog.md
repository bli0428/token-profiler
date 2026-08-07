# Session Catalog Contract

The catalog is private local storage at `<root>/dashboard-session-catalog-v1.json`.

- It contains only privacy-safe dashboard session summary fields, including
  the resolved session label, and source fingerprints.
- `GET /api/sessions` reads the catalog synchronously when current.
- On a miss, it returns stat-only session rows and schedules a single local rebuild.
- It never exposes filesystem paths through the dashboard API.
