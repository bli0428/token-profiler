# Research: Large Run Artifact Pages

## Decision: Stream and filter the selected request for every artifact page

**Rationale**: The canonical JSONL store is the authoritative source and already streams records without loading the full file. Filtering as it streams limits retained artifact history to the requested page and a single matching look-ahead record, preserving the large-run memory boundary while ensuring rows belong only to the selected request.

**Alternatives considered**:

- Reuse the normal run analyzer: it materializes run-wide artifact/detail structures and violates the large-run path's memory goal.
- Build a persistent per-request artifact index: adds a new cache lifecycle and invalidation surface before measurement proves it is required.

## Decision: Use a source-, run-, and request-bound opaque artifact cursor

**Rationale**: A continuation represents one ordered selected-request stream. Binding its offset to `run_id`, `request_id`, and source file version prevents an offset from being replayed for another request/run or against changed input. The browser only forwards the token.

**Alternatives considered**:

- Share the request-page cursor without a request binding: permits cross-request offsets and loses the selected-request invariant.
- Expose a numeric offset: leaks an implementation detail and lets callers forge pagination state.

## Decision: Return only privacy-safe artifact list fields

**Rationale**: Investigators need type, stable identity/display label, request order, local token count, and availability state to identify large contributors. Existing privacy mapping determines the display state; raw content and preview body are not required for a page and are deliberately excluded.

**Alternatives considered**:

- Return `content`, `preview`, or arbitrary metadata: risks converting the large-run list into transcript/detail delivery and bypassing privacy behavior.
- Omit privacy state: hides whether a detail is available and makes the display behavior inexplicable.

## Decision: Use one matching-record look-ahead to determine continuation

**Rationale**: After filling a page, consuming at most one additional matching artifact precisely determines whether `next_cursor` is needed. It avoids a second scan and does not retain historical artifact rows.

**Alternatives considered**:

- Always issue a next cursor: creates an avoidable empty final page.
- Count all matching artifacts first: requires an additional full scan or more retained state.

