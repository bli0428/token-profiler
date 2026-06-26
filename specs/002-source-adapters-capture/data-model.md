# Data Model: Source Adapters And Capture Boundaries

## SourceAdapter

Represents a source-specific capture or import boundary.

- `source_id`: stable source identifier such as `codex-proxy`, `codex-log-import`, or `fixture-source`
- `display_name`: user-readable source label
- `capture_method`: `live`, `import`, or `fixture`
- `adapter_version`: adapter implementation version when known
- `supported_records`: canonical record kinds the adapter can emit
- `known_limitations`: source-level limitation notes

Validation rules:

- Provider-specific payloads are interpreted only inside the source adapter.
- Adapters emit canonical records plus limitation metadata; analyzers do not receive provider payloads.

## CaptureSession

Represents one local captured or imported workflow.

- `run_id`: stable local session identifier
- `source_id`
- `capture_method`
- `storage_mode`
- `adapter_version`
- `created_at`
- `updated_at`
- `limitations`

Relationships:

- Has many canonical artifact records.
- Has many request usage records.
- Has zero or more source limitation records.

## SourceLimitation

Represents an explicit completeness or observability caveat.

- `code`: stable machine-readable limitation code
- `message`: human-readable explanation
- `severity`: informational, partial, or unavailable
- `applies_to`: session, request, artifact, usage, or tool relationship
- `source_id`

Examples:

- prompt composition unavailable
- provider usage missing
- malformed import entry skipped
- tool output unpaired

## CanonicalCaptureWriter

Source-agnostic writer that creates and stores canonical events.

- `run_id`
- `storage_mode`
- `token_counter`
- `tokenizer_name`
- `store`

Relationships:

- Used by live proxy, log import, manual capture commands, and fixture-source validation.
- Owns canonical artifact event creation, privacy mode application, token counting, and append-only writes.

## CodexProxyAdapter

Live Codex capture source.

- Interprets Codex/OpenAI-compatible request payloads.
- Records request artifacts and response usage.
- Maintains Codex-specific session routing.
- Supports Codex config enable/disable helpers.

## CodexLogImportAdapter

Historical Codex log import source.

- Reads rollout JSONL or session metadata files.
- Emits canonical usage and artifact records when source facts are available.
- Reports malformed or unsupported entries as limitations.

## FutureSourceAdapterSeam

Fixture-validated acceptance path for later non-Codex adapters.

- Provides an example adapter that is not used as a user-facing integration.
- Emits canonical records and source limitations.
- Proves no Codex-specific or analyzer changes are required.

## LegacyCaptureModule

Existing top-level implementation that must be moved or split.

- `src/profiler.js`: canonical capture writer behavior
- `src/session-router.js`: Codex proxy session routing behavior
- `src/codex-config.js`: Codex config mutation behavior
- `src/codex-sessions.js`: Codex session metadata/log reading behavior
- CLI-owned `runCodexImport`: Codex log import behavior that should move into an adapter
