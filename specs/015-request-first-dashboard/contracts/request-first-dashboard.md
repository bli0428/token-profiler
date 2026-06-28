# Contract: Request-First Dashboard Surface

## Purpose

This contract describes how the dashboard browser surface consumes the request accounting API contract from spec 014. It is a rendering and interaction contract, not a new analyzer contract.

## Base Rules

- The dashboard consumes `DashboardApiRun.requests` as the source of chronological request rows.
- The dashboard consumes session identity and token totals from session/run API payloads.
- Browser code must not recompute request usage totals, uncached totals, chronology, cache attribution, session identity confidence, or artifact attribution.
- Missing metrics render as unavailable, partial, unsupported, or empty states.
- Provider-reported request totals and local estimated artifact values must be visually/textually distinct.
- Request expansions and artifact detail must respect privacy display state and never reveal hidden raw content.

## Expected API Inputs

### Status Capability

The dashboard treats request-first rendering as supported when status capabilities include request accounting:

```ts
type DashboardCapabilities = {
  sessions: boolean;
  run_view: boolean;
  artifact_detail: boolean;
  request_accounting?: boolean;
  refresh: "none" | "request" | "auto";
};
```

If `request_accounting` is missing or false, the selected-run center pane renders an unsupported request-accounting state.

### Session List Input

Session list rows may include the additive identity and availability fields defined by spec 014:

```ts
type DashboardApiSession = {
  run_id: string;
  canonical_run_id?: string;
  label?: string;
  identity?: SessionIdentityMapping;
  availability?: AnalyzerAvailability;
  caveats?: DashboardApiCaveat[];
};
```

Dashboard behavior:

- Use `run_id` for routing and selection.
- Display Codex-facing identity when present.
- Display limitations when mapping confidence is not `one_to_one` or availability is partial/unavailable.

### Selected Run Input

The selected run may include request accounting:

```ts
type DashboardApiRun = {
  run_id: string;
  overview: DashboardApiRunOverview;
  requests?: DashboardApiRequestAccounting;
  artifacts: DashboardApiArtifactRow[];
  artifact_details: Record<string, DashboardApiArtifactDetail>;
  task_groups: DashboardApiTaskGroup[];
  filters: DashboardApiFilterOptions;
  privacy: DashboardApiPrivacyState;
  caveats: DashboardApiCaveat[];
};
```

Dashboard behavior:

- When `requests.rows` exists, render request rows in array order.
- When `requests` is missing, render unsupported state.
- When `requests.rows` is empty, render empty state.
- When request availability is partial/unavailable, keep the row visible and display limitations.

## Request Row Rendering

Each row consumes API-owned fields from spec 014:

```ts
type DashboardApiRequestAccountingRow = {
  request_id: string;
  timestamp?: string;
  chronology_index: number;
  availability: RequestUsageAvailability;
  usage?: ProviderRequestUsage;
  artifact_count: number;
  total_local_artifact_tokens: number;
  cache_attribution?: DashboardApiCacheAttribution;
  artifact_inclusions: DashboardApiRequestArtifactInclusion[];
  caveats: DashboardApiCaveat[];
};
```

Display requirements:

- Show request identity, time/index, availability, cached input, uncached input, total input, output, and total tokens.
- Show unavailable labels for absent `usage`.
- Label `total_local_artifact_tokens` and inclusion attribution as estimates.
- Expose an expansion control when `artifact_inclusions` is non-empty; otherwise show that no request-scoped artifacts are available.

## Request Artifact Rendering

Nested artifact rows consume request-scoped inclusion fields:

```ts
type DashboardApiRequestArtifactInclusion = {
  artifact_id: string;
  stable_short_id: string;
  artifact_type: string;
  display_name: string;
  display_category: string;
  request_order: number;
  local_token_count: number;
  estimated_cached_input_tokens?: number;
  estimated_uncached_input_tokens?: number;
  attribution_state: string;
  privacy: DashboardApiPrivacyState;
  caveats: DashboardApiCaveat[];
};
```

Display requirements:

- Preserve inclusion order from the contract.
- Show privacy state and caveats.
- Offer artifact detail navigation only when detail exists for the artifact.
- Never render raw artifact content in the nested row.

## Interaction Contract

- Selecting a session updates the selected run and resets expanded requests that are not present in the new run.
- Expanding/collapsing a request is local view state.
- Opening artifact detail from a request inclusion selects that artifact without changing request order.
- Refresh preserves selected run, expanded requests, and selected artifact only when those IDs still exist.
- Keyboard users can focus request rows, toggle expansion, and open artifact detail controls.

## Compatibility Contract

- Older API payloads without `requests` are supported through an unsupported request-accounting state.
- Partial request accounting is supported through row and collection availability states.
- Existing aggregate artifact data may still feed secondary detail, but it must not become the default selected-run center pane.

## Privacy Contract

- Metadata-only fixtures must not render hidden prompt, file, command, tool output, patch, or message bodies.
- Preview/raw-available labels come only from existing dashboard privacy policy.
- Request expansion rows render identifiers, labels, counts, privacy state, and caveats only.
