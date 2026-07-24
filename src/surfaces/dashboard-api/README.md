# Dashboard API

This surface owns the local dashboard HTTP API contract.

Use this layer to map analyzer output into dashboard-friendly response shapes
that the React app can consume.

For large runs, `GET /api/runs/{run_id}/large/requests` returns a bounded,
newest-first request page. It maps only canonical request usage, turn identity,
timestamps, and aggregate artifact counts. The API owns opaque continuation
cursors; clients forward them unchanged and never decode them.

For boundary rules and allowed inputs/outputs, see [contract.md](contract.md).
