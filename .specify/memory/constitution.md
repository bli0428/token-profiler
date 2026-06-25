# Token Efficiency Tracker Constitution

## Core Principles

### I. Local-First Observability
Core workflows MUST run locally by default. Capture paths use loopback/local storage unless the user explicitly enables export or remote integration.

### II. Privacy Modes Are Product Behavior
Metadata-only is the default. Preview and raw-content modes MUST be explicit, visible, and tested. Raw content storage is sensitive transcript archival.

### III. Provider-Agnostic Insight
Users should understand context behavior across supported agent environments without needing provider-specific internals. Provider limitations MUST be disclosed when they affect completeness.

### IV. Explainability Over Raw Numbers
Reports MUST explain what was in context: commands, patches, files, tool calls, task phases, and persistence. Token tables are evidence, not the outcome.

## Documentation Separation

Specs describe what and why. Plans describe how. Specs MUST stay technology-agnostic; implementation details, architecture patterns, dependencies, storage decisions, and testing strategy belong in plans, research notes, or code. Technical details in specs are blockers.

## Development Workflow

Specs are independently valuable vertical slices with testable user stories. Stored-data changes require compatibility and privacy review. Capture changes require tests for the selected privacy mode. User-facing reports must preserve explainability.

## Code Organization

Files and modules MUST have clear responsibility boundaries. Files approaching 600 lines require review for splitting; files over 600 lines are acceptable only when they remain cohesive and splitting would reduce clarity.

## Governance

This constitution governs specs and plans. Amendments require a rationale. Privacy modes, documentation separation, and provider-agnostic insight cannot be bypassed without explicit user approval.

**Version**: 1.0.0 | **Ratified**: 2026-06-25 | **Last Amended**: 2026-06-25
