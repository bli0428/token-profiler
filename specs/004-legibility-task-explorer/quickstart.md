# Quickstart: Legibility And Task Explorer

## Prerequisites

- Install dependencies with `npm install` if the workspace is fresh.
- Use Node.js 18 or newer.
- Ensure specs 001, 002, 003, and 006 have been implemented or their required interfaces are available.

## Validate with Automated Checks

```bash
npm test
npm run typecheck
```

Expected outcome:

- Existing analyzer and privacy tests pass.
- New legibility/task grouping tests pass.
- Type checking reports no analyzer/surface boundary errors.

## Fixture Scenario 1: Readable Work Unit Labels

Use or create a fixture run containing:

- a command tool call
- the linked command output
- a patch tool call
- an assistant or user message artifact
- one unknown or legacy artifact

Run the legibility report:

```bash
node src/cli.js legibility <fixture-run-dir>
```

Expected outcome:

- Command and patch rows show readable labels.
- Linked output rows inherit command/workdir context when available.
- Unknown rows remain visible with stable IDs and missing-metadata caveats.
- Re-running the command produces the same order.

## Fixture Scenario 2: Artifact Drilldown

Run artifact detail for a command output and a patch artifact:

```bash
node src/cli.js explain <fixture-run-dir> --artifact <artifact-id-or-readable-label>
```

Expected outcome:

- Detail includes stable identity, category, exposure, repeated exposure, inclusion count, first/last seen, privacy state, and caveats.
- Command detail includes command/workdir/exit facts when captured.
- Patch detail includes touched files or a clear unavailable/hidden explanation.
- Estimated cache or uncached artifact values include the attribution caveat.

## Fixture Scenario 3: Task Groups

Use or create a fixture run with at least two user-intent phases and interleaved tool activity.

Run the summary or task-focused report once the surface is wired:

```bash
node src/cli.js summarize <fixture-run-dir>
```

Expected outcome:

- Task groups appear in chronological order.
- Each task group has a safe label, confidence state, request range, top artifacts, exposure rollup, and caveats.
- Metadata-only fixtures do not show raw prompts or raw tool output.

Implemented surface note: task groups render in the standard `summarize` output
under the `Task Groups` section and are also present in JSON analyzer output.

## Fixture Scenario 4: Privacy Modes

Run equivalent fixtures in metadata-only, preview, and raw-content modes.

Expected outcome:

- Metadata-only mode uses structural labels and hides raw text.
- Preview mode shows truncated previews only where permitted.
- Raw-content mode can expose richer detail only in explicit detail contexts.
- Hidden content is represented by privacy state and caveats, not silent blanks.

## Manual Boundary Check

Before implementation is considered complete, inspect analyzer imports:

```bash
rg "from .*adapters|from .*live-proxy|from .*log-import" src/analysis
```

Expected outcome:

- No legibility or task-group analyzer imports adapter modules or provider-specific capture modules.
