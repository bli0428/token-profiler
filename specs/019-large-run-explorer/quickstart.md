# Quickstart: Large Run Explorer

1. Run `npm test` and `npm run typecheck`.
2. Run the large-run store and dashboard API tests in `test/large-run-*.test.js`.
3. Start the dashboard API and open a run whose `events.jsonl` is larger than the configured full-detail threshold.
4. Confirm the sessions list calls it available and the large view contains a bounded newest-first request page. Follow the optional cursor to confirm subsequent request pages are also bounded.
