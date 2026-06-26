# Quickstart: Validate Spec 001

## Goal

Verify that the project can write and read canonical event records while honoring storage modes.

## Commands

Run the full test suite:

```bash
npm test
```

Create a metadata-only demo run:

```bash
node src/cli.js demo
node src/cli.js summarize ~/.token-profiler/runs/demo
```

After implementation, verify storage modes with focused tests:

```bash
node --test test/events.test.js test/privacy.test.js test/profiler.test.js
```

## Expected User-Facing Documentation

Reports or docs that show artifact-level attribution must include:

```text
Local artifact attribution is estimated based on local tokenizer counts.
```

## Manual Inspection

Inspect an event file:

```bash
sed -n '1,5p' ~/.token-profiler/runs/demo/events.jsonl
```

Metadata-only events should include `storage_mode: "metadata"` and should not include `content` or `preview`.
