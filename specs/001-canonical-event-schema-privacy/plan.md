# Implementation Plan: Consistent Capture Records And Privacy Modes

**Branch**: `001-canonical-event-schema-privacy` | **Date**: 2026-06-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-canonical-event-schema-privacy/spec.md`

## Summary

Introduce a canonical event layer and explicit privacy-mode policy for captured records. New writers emit the new event contract only. Existing MVP files are supported through a separate legacy import adapter. This plan keeps JSONL storage while adding event constructors, validation tests, retention-mode fields, preview/raw handling, and clear documentation that local artifact attribution is estimated based on local tokenizer counts.

## Technical Context

**Language/Version**: JavaScript on Node.js 18+

**Primary Dependencies**: Current runtime dependencies plus a schema validator to be selected during implementation. Candidate: Zod if the project moves to TypeScript or remains JS with runtime validation.

**Storage**: JSONL event files under `~/.token-profiler/runs/`. Existing repo-local `./.token-profiler/` files are legacy input only and must go through the legacy import adapter if needed. Do not migrate to SQLite in this feature.

**Testing**: `node --test`

**Target Platform**: Local developer machine, macOS-first but Node-compatible across platforms.

**Project Type**: Local CLI/proxy library with report generation.

**Performance Goals**: Validation and privacy policy application should not materially affect streaming proxy latency. Event writes remain append-only.

**Constraints**: Metadata-only remains default. Raw content storage must require explicit opt-in. Existing MVP event files must be handled by the legacy import adapter, not by weakening the new event contract.

**Scale/Scope**: Current sessions of 100-200 model requests and tens of thousands of artifact events should remain practical.

## Constitution Check

- **Local-first observability**: Pass. All storage remains local; no hosted dependency introduced.
- **Privacy modes**: Pass. This is the primary feature.
- **Provider-agnostic insight**: Pass. Canonical records reduce provider-specific leakage into later features.
- **Explainability over raw numbers**: Pass. Record contracts preserve labels and metadata needed for readable reports.
- **Documentation separation**: Pass. Product requirements remain in `spec.md`; technical choices live here.
- **Code organization**: Pass if schema/privacy code is split from proxy parsing and reporting. Files nearing 600 lines must be reviewed for responsibility splits.

## Project Structure

### Documentation

```text
specs/001-canonical-event-schema-privacy/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── event-records.md
│   └── legacy-mvp-import.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code

```text
src/
├── events.js              # canonical event constructors and validation helpers
├── privacy.js             # retention policy and preview/raw handling
├── profiler.js            # uses canonical constructors
├── proxy.js               # source extraction, no direct event shape ownership
├── legacy-import.js       # converts older MVP events into canonical events
├── aggregate.js           # reads canonical events only
└── store.js               # JSONL storage remains append/read only

test/
├── events.test.js
├── privacy.test.js
├── profiler.test.js
├── proxy.test.js
└── aggregate.test.js
```

**Structure Decision**: Keep the single-package Node project. Add small modules for event construction, privacy policy, and legacy import rather than growing `profiler.js`, `proxy.js`, or `aggregate.js`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Runtime schema validation | Captured files are persisted and read across versions | Ad hoc object construction already caused ambiguity around metadata and raw content |
