# Research: Large Run Request Pages

## Decision: Reuse the compact request projection from feature 019

**Rationale**: A scan can discard each artifact after updating its request row, preserving bounded artifact-history memory while retaining the fields required by this feature. Request pages become an inexpensive slice of a compact, deterministically ordered projection.

**Alternatives considered**:

- Run the normal full-detail analyzer: it retains artifact-level information and defeats the large-run memory goal.
- Rescan and sort the JSONL source for every page: avoids a cache but produces unacceptable repeated work and cannot safely produce a stable offset page without retaining ordering state.

## Decision: Make the dashboard API own opaque, source-bound cursors

**Rationale**: The API can validate pagination boundaries, reject malformed or cross-run cursors, and invalidate a cursor after the event file changes. The client needs only to return the cursor verbatim.

**Alternatives considered**:

- Expose a numeric offset: callers can forge values and become coupled to pagination internals.
- Use timestamp-only cursors: timestamps can tie, so a stable page boundary would still need a canonical tie-breaker and source-version check.

## Decision: Return canonical request facts only

**Rationale**: Provider-reported usage, canonical turn identity, timestamp, and artifact totals support investigation without exposing source payloads or materializing artifact detail.

**Alternatives considered**:

- Return provider request objects: violates the adapter boundary and couples the dashboard to source formats.
- Embed artifact rows in each request: creates unbounded response/memory work; request artifact pages belong to feature 021.

## Decision: Cap page sizes at 500

**Rationale**: A cap limits response payload and browser rendering work while allowing an investigator to inspect enough recent requests. Defaulting to 50 makes first load comfortably bounded.

**Alternatives considered**:

- No cap: a client can recreate an all-request response.
- Fixed-only pages: prevents deliberate operator tuning without improving the core safety guarantee.
