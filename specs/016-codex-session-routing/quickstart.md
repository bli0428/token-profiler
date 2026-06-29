# Quickstart: Codex Session Routing Validation

## Prerequisites

- Work from the repository root.
- Restart the live proxy before manual validation so the running process loads the new routing behavior.
- Use new live traffic or synthetic live-proxy request fixtures; historical runs are intentionally out of scope.

## Automated Validation

Run type checking:

```bash
npm run typecheck
```

Run focused session-routing tests:

```bash
node --import tsx --test test/session-router.test.js
```

Run the full root suite. The proxy tests bind loopback, so environments with network sandboxing may need local loopback permission:

```bash
npm test
```

Expected result:

- Requests with matching Codex session identity resolve to the same local session id.
- Requests with different Codex session identities resolve separately.
- Codex session identity wins over `prompt_cache_key`.
- Malformed known request fields fail adapter-boundary validation.
- Existing fallback behavior remains available only when Codex session identity is absent.

## Manual New-Traffic Validation

1. Restart the Codex live proxy.
2. Start one Codex session and send at least two requests through the proxy.
3. Start a second Codex session and send at least one request through the proxy.
4. Inspect the local run directories under the configured profiler root.

Expected result:

- The first session's requests appear under one local run/session group.
- The second session's requests appear under a different local run/session group.
- New groups are not named from provider cache keys when Codex session identity is present.
- Artifact metadata for recorded request artifacts includes a routing source that explains the grouping decision.

## Boundary Checks

Use representative captured request shapes to confirm:

- Full Codex turn metadata is parsed before compatibility fields are considered.
- Compatibility headers are preserved as separate observations.
- Unknown top-level body fields appear as diagnostics, not grouping keys.
- Raw request content is not persisted in metadata-only mode solely for routing.

## Out Of Scope

- Migrating existing `codex-cache-*` runs.
- Dashboard rendering or session-list changes.
- Reinterpreting imported Codex rollout logs.
