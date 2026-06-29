# Quickstart: Codex Session Dashboard Grouping

## Prerequisites

- Install dependencies at the repository root and in `dashboard/` if they are not already installed.
- Restart the live proxy before capturing new traffic so upstream session routing emits Codex-session grouped run ids.

## Validation Commands

From the repository root:

```bash
npm run typecheck
node --import tsx --test test/codex-sessions.test.js test/dashboard-api-request-accounting.test.js
```

From `dashboard/`:

```bash
npm run typecheck
npm test -- --run src/test/session-list.test.tsx src/test/shell-controller.test.tsx
```

## Manual Dashboard Check

1. Capture new Codex traffic after restarting the proxy.
2. Start the dashboard API and Vite dashboard using the existing project commands.
3. Open the dashboard session list.
4. Confirm multiple requests from the same Codex session appear as one row labeled as Codex-session grouped.
5. Confirm another Codex session appears as a separate row even if titles or cache hints are similar.
6. Select each row and confirm the request list changes to only that row's requests.
7. Confirm fallback/cache rows are labeled as fallback/partial and keep their limitation text.

## Expected Outcome

- New Codex-session grouped traffic is visually distinct from fallback grouping.
- Session selection remains keyed by `run_id`.
- Request-level token metrics and privacy behavior remain unchanged.
