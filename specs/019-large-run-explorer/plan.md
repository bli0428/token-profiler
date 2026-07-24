# Implementation Plan: Large Run Explorer

**Branch**: `main` | **Date**: 2026-07-24 | **Spec**: [spec.md](./spec.md)

## Summary

Provide bounded-memory opening and request-list exploration of huge captured JSONL runs. The canonical store will expose a streaming reader; an analyzer-owned large-run projection will derive request metrics without retaining artifact history; dashboard API and React will use cursor pages for large runs. Normal runs retain the existing full-detail path. Request artifact drilldown is explicitly deferred to its follow-on feature.

## Technical Context

**Language/Version**: TypeScript/Node.js 18+, React 19  
**Primary Dependencies**: Node streams/readline, existing React/Vite/Vitest  
**Storage**: Existing local JSONL; no migration or second database  
**Testing**: Node test runner, TypeScript, Vitest  
**Target Platform**: Local proxy and dashboard  
**Performance Goals**: Never allocate a whole event file as one string; retain O(requests + page size), not O(events), for large-run overview/request paging  
**Constraints**: Preserve Adapters → Canonical Store → Analyzers → Surfaces; preserve privacy and normal-run API contract  
**Scale/Scope**: 1 GB+ / 1M-event captures, newest-first request pages, and overview metrics; request artifact pages are out of scope

## Constitution Check

- Local-first observability: pass; all reads are local and read-only.
- Privacy modes: pass; large pages map canonical artifact metadata through the existing privacy-aware surface mapper.
- Provider-agnostic insight: pass; streaming consumes canonical events only.
- Architecture boundaries: pass; store streams, analyzer projects, surface transports/renders.
- Explainability: pass; request rows expose provider usage and artifact inclusion counts.

## Project Structure

```text
src/core/store/index.ts                    # streaming canonical-event reader
src/analysis/large-run.ts                  # bounded-memory projections
src/analysis/index.ts                      # public analyzer export
src/surfaces/dashboard-api/large-runs.ts   # bounded summary and request-page response ownership
src/surfaces/dashboard-api/routes.ts       # routes
src/surfaces/dashboard-api/sessions.ts     # large-run summaries
dashboard/src/api/types.ts                 # transport types
dashboard/src/api/client.ts                # paged API client
dashboard/src/run-explorer/LargeRunExplorer.tsx
test/large-run-store.test.js
test/large-run-dashboard-api.test.js
```

## Workstream Boundaries

1. Core store: parse complete JSONL lines incrementally.
2. Analyzer: group only request facts and aggregate totals; it does not retain artifact history.
3. Dashboard API: own opaque cursors and response mapping.
4. Dashboard: render API-provided pages and explicit large-run state.

## Post-Design Constitution Check

Pass. No provider payload crosses the adapter boundary and no raw content is introduced.
