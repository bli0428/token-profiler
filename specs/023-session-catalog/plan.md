# Implementation Plan: Session Catalog

**Date**: 2026-07-25 | **Spec**: [spec.md](./spec.md)

## Summary

Add a canonical-store-backed, local persisted catalog for dashboard session pages. The session surface will read catalog entries only; a missing/stale catalog returns filesystem-stat rows and triggers one asynchronous rebuild.

## Technical Context

TypeScript/Node 18, local JSON files, Node test runner. The feature preserves `Adapters → Canonical Store → Analyzers → Surfaces`: catalog persistence belongs to the canonical store; analyzer summaries remain analyzer-owned; dashboard sessions consume catalog records only.

## Constitution Check

Pass: local-only, privacy-safe fields, canonical records only, and no provider payloads in the catalog.

## Structure

```text
src/core/store/session-catalog.ts
src/core/store/index.ts
src/surfaces/dashboard-api/sessions.ts
test/session-catalog.test.js
```
