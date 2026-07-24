# Quickstart: Large Run Explorer

1. Run `npm test` and `npm run typecheck`.
2. Run `npm --prefix dashboard test` and `npm --prefix dashboard run typecheck`.
3. Run the focused large-run coverage with `node --import tsx --test test/large-run-store.test.js test/large-run-analyzer.test.js test/large-run-dashboard-api.test.js`.
4. Start the dashboard API and open a run whose `events.jsonl` is larger than the configured full-detail threshold.
5. Confirm the sessions list calls it available and the large view contains a bounded newest-first request page. Follow the optional cursor to confirm subsequent request pages are also bounded.

## Validation evidence

On 2026-07-24, the focused large-run suite passed (6 tests), the root suite
passed (143 tests), and the dashboard suite passed (68 tests). Both root and
dashboard TypeScript checks passed. The root suite requires local loopback
permission for the proxy tests that bind a temporary `127.0.0.1` server.
