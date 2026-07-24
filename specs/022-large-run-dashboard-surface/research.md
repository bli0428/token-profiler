# Research: Large Run Dashboard Surface

## Decision: Use an explicit session-caveat switch for the paged explorer

**Rationale**: The dashboard API already marks a session with
`large_run_paged`. Selecting `LargeRunExplorer` from that declared capability
keeps the normal full-run request path out of a large-run selection and avoids
client-side thresholds based on incomplete information.

**Alternatives considered**:

- Infer a large run from `artifact_count` or browser response size: the normal
  run response itself may already exceed the intended boundary, and the client
  would own a server policy.
- Put pagination conditionals throughout `RunExplorer`: it would mix the
  full-detail and bounded-path contracts in one component.

## Decision: Treat API cursors as replacement-page continuations

**Rationale**: The request and artifact API calls each return one bounded,
ordered page and a next cursor. Replacing the visible page on continuation
keeps browser state bounded and makes the component's state exactly match its
latest API response. The selected artifact page is reset when the run changes
or a different request is selected.

**Alternatives considered**:

- Accumulate every page: it recreates a run-wide browser list during a long
  investigation.
- Decode an offset to merge or deduplicate locally: breaks opaque cursor
  ownership and duplicates server pagination logic.

## Decision: Render privacy as the returned availability state only

**Rationale**: `preview_state` allows investigators to understand whether an
artifact is hidden, preview-capable, or raw-available without sending or
reconstructing stored content. The dashboard needs no new privacy policy.

**Alternatives considered**:

- Request normal artifact detail from the large-run table: expands this feature
  into content/detail delivery and may violate the bounded path.
- Derive a state from display name/type: is neither authoritative nor safe.
