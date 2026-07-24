# Research: Large Run Explorer

## Decision: Stream JSONL one complete line at a time

**Rationale**: The failing capture is 1.51 GB and Node fails while converting it into one UTF-8 string. A `createReadStream`/`readline` reader bounds input buffering and discards each parsed event after downstream processing.

**Alternatives considered**:

- Raise Node memory limits: does not fix the unbounded-memory design or the dashboard response size.
- Read only a file tail: useful for diagnosis but cannot support reliable paging through a session.

## Decision: Maintain a compact request projection while scanning

**Rationale**: Large captures can have millions of artifacts but far fewer requests. Keeping request rows and counts while discarding artifact records supports useful chronological drilldown in bounded memory.

**Alternatives considered**:

- Reuse the full analyzer pipeline: it validates, retains, and sorts every artifact; unsuitable for this path.
- Introduce SQLite now: stronger indexing, but a new storage dependency and migration exceed the focused large-run recovery scope.

## Decision: Add paginated large-run API routes and preserve normal-run routes

**Rationale**: Existing consumers receive full run details for small captures. Large runs need a separate contract that never returns all artifact details in one payload.

**Alternatives considered**:

- Change the existing run response to partial data: breaks its full-detail contract.
- Persist a full dashboard projection: would require materializing a potentially huge second artifact store.
