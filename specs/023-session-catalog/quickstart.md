# Quickstart

1. Run `node --import tsx --test test/session-catalog.test.js`.
2. Call `createDashboardSessionIndex` twice against a temporary root with an oversized event file.
3. Confirm the first call is stat-only and the second call is catalog-backed without reading event JSONL.
