# Research: Consistent Capture Records And Privacy Modes

## Decision: Keep JSONL For This Feature

**Decision**: Continue writing append-only JSONL event files for this spec.

**Rationale**: JSONL is already used, easy to inspect, and compatible with current reports. The feature is about record shape and privacy policy, not storage migration.

**Alternatives considered**:

- SQLite: better for dashboard queries and indexing, but premature until canonical records stabilize.
- Raw request archive: highest fidelity, but conflicts with metadata-only default and increases local risk.

## Decision: Add Runtime Validation At Event Boundaries

**Decision**: Introduce explicit constructors/validators for artifact and usage events.

**Rationale**: Current events are plain objects. Validation at write/read boundaries makes privacy mode, event variants, and future adapters easier to reason about.

**Alternatives considered**:

- Compile-time-only types: useful later, but runtime validation is needed because events are persisted and may come from older files.
- Informal tests only: insufficient as event variants grow.

## Decision: Privacy Mode Applies Per Captured Item

**Decision**: Store the selected retention level on each captured item event.

**Rationale**: Runs can span multiple proxy versions or restarts. Per-item policy makes mixed sessions auditable.

**Alternatives considered**:

- Run-level-only policy: simpler, but inaccurate when settings change mid-run.

## Decision: Preview Mode Stores Bounded Excerpts And Derived Facts

**Decision**: Preview mode stores bounded head/tail excerpts and non-sensitive derived facts where available.

**Rationale**: This gives useful inspection without creating a full transcript archive.

**Alternatives considered**:

- Store first N characters only: misses tail-heavy failures and command summaries.
- Store model-generated summaries: requires extra model calls and introduces summary trust issues.

## Documentation Requirement

User-facing docs and reports for this feature must include:

```text
Local artifact attribution is estimated based on local tokenizer counts.
```

Provider-reported request totals remain separate from local artifact attribution.
