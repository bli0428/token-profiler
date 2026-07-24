# Quickstart: Validate Large Run Dashboard Surface

## Prerequisites

- Node.js 18+ and installed root/dashboard dependencies.
- Existing large-run endpoint support from features 019--021.

## Focused validation

From the repository root:

```sh
npm --prefix dashboard run typecheck
npm --prefix dashboard test -- large-run-explorer.test.tsx shell-controller.test.tsx api-client.test.ts
node --import tsx --test test/large-run-dashboard-api.test.js
```

Use the dashboard test command's matching test-file extension if the local
Vitest configuration names it differently.

## End-to-end scenario

1. Start the local dashboard API and select a session that carries the
   `large_run_paged` caveat.
2. Confirm the dashboard shows **Large run (paged)** rather than the normal
   full-run artifact explorer, with only the first request page visible.
3. Choose **Next requests** and confirm the client sends the response's cursor
   unchanged and replaces the request page with the returned one.
4. Choose **Artifacts** for a request. Confirm every displayed row belongs to
   that request and shows only type, identity, local token contribution, and
   API-supplied privacy availability.
5. Choose **Next artifacts** when available. Confirm its cursor is forwarded
   unchanged and the page replaces the current artifact rows.
6. Select a normal session and confirm the existing normal-run explorer still
   appears.

## Expected result

An investigator can progressively explore an available large session through
bounded API pages, with no browser-side grouping/privacy inference and no
all-artifact response.

## Validation evidence

On 2026-07-24, `npm --prefix dashboard test` passed all 74 dashboard tests,
`npm --prefix dashboard run typecheck` passed, and
`node --import tsx --test test/large-run-dashboard-api.test.js` passed all 3
large-run API tests.
