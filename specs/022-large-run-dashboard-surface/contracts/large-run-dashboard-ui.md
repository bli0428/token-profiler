# Large Run Dashboard UI Contract

The dashboard package consumes the existing read-only large-run API contract.
This document defines the frontend boundary; server route shapes remain owned
by `src/surfaces/dashboard-api/contract.md`.

## Entry Condition

`DashboardController` renders the dedicated large-run explorer only when the
selected session contains the API-provided caveat:

```ts
{ code: "large_run_paged", severity: "info", message: string }
```

Otherwise it preserves the normal `RunExplorer` flow. The frontend must not
derive this state from local files, response size, or aggregate fields.

## Client Calls

```ts
getLargeRun(runId: string, cursor?: string): Promise<ApiEnvelope<LargeRunResponse>>;
getLargeRunRequests(runId: string, cursor?: string): Promise<ApiEnvelope<LargeRunPage>>;
getLargeRunArtifacts(
  runId: string,
  requestId: string,
  cursor?: string
): Promise<ApiEnvelope<LargeRunArtifactPage>>;
```

- The initial explorer load calls `getLargeRun(runId)` without a cursor.
- **Next requests** passes `run.request_page.next_cursor` unchanged to
  `getLargeRunRequests` and replaces the displayed request page with the
  response.
- **Artifacts** calls `getLargeRunArtifacts(runId, requestId)` for the selected
  request.
- **Next artifacts** passes `artifacts.next_cursor` unchanged with that page's
  `request_id` and replaces the displayed artifact page with the response.

The client URL-encodes route identifiers. The browser must not decode,
validate, construct, persist, or reuse a cursor across a different run/request.

## Rendering Rules

- Identify the view as a paged large-run experience and show returned overview
  totals.
- Render request rows only from `LargeRunRequest` fields and artifact rows only
  from `LargeRunArtifact` fields.
- Render `preview_state` solely as API-supplied privacy availability; do not
  expose or derive preview/raw content.
- Disable actions when the corresponding client method is unavailable.
- Reset transient large-run state when `runId` changes so a previous run or
  selected request cannot remain visible.

## Invariants

- A large-run component never calls `getRun`, imports root server modules, or
  reads JSONL.
- Each browser response and component page state is bounded by the API page
  size; the UI does not accumulate every request/artifact page.
- The normal explorer remains available for sessions not marked
  `large_run_paged`.
- UI tests use API-shaped fixture data and assert opaque cursor forwarding.
