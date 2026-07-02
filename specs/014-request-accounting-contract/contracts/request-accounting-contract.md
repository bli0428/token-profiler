# Contract: Request Accounting

## Purpose

Request accounting is the dashboard/API contract that lets clients rank provider requests, inspect request-scoped artifact contributors, and understand session identity confidence without recalculating analyzer logic in browser surfaces.

## Base Rules

- Provider-reported request usage is authoritative at request level.
- Missing usage is an availability state, never zero.
- Request artifact attribution is estimated from local tokenization and offsets.
- Request-scoped artifact inclusions are not aggregate artifact totals.
- Privacy modes apply to every request and inclusion payload.
- Dashboard clients consume these fields and must not recompute request totals, uncached totals, cache attribution, or session identity confidence.

## Analyzer Contract

```ts
type RequestAccountingResult = {
  analyzer_id: "request-accounting";
  schema_version: 1;
  availability: AnalyzerAvailability;
  summary: {
    request_count: number;
    usage_reported_count: number;
    usage_incomplete_count: number;
    artifact_inclusion_count: number;
    highest_total_request_id?: string;
    highest_uncached_request_id?: string;
  };
  metrics: {
    request_count: number;
    usage_reported_count: number;
    usage_incomplete_count: number;
    artifact_inclusion_count: number;
    highest_total_request_id: string | null;
    highest_uncached_request_id: string | null;
  };
  rows: RequestAccountingRow[];
  caveats: AnalysisCaveat[];
};
```

```ts
type RequestAccountingRow = {
  request_id: string;
  timestamp?: string;
  chronology_index: number;
  availability: RequestUsageAvailability;
  usage?: ProviderRequestUsage;
  artifact_count: number;
  total_local_artifact_tokens: number;
  cache_attribution?: {
    estimated_cached_input_tokens?: number;
    estimated_uncached_input_tokens?: number;
    normalized_estimated_input_tokens?: number;
    estimated_cache_hit_ratio?: number;
    attribution_coverage?: number | "partial" | "unavailable";
    attribution_state: "complete" | "partial" | "unavailable" | "overlong_normalized" | "under_attributed" | "estimated";
  };
  artifact_inclusions: RequestArtifactInclusion[];
  caveats: AnalysisCaveat[];
};
```

```ts
type ProviderRequestUsage = {
  input_tokens: number;
  cached_input_tokens: number;
  uncached_input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  response_id?: string;
  source: "provider_reported";
};
```

```ts
type RequestArtifactInclusion = {
  artifact_id: string;
  stable_short_id: string;
  artifact_type: string;
  display_name: string;
  display_category: string;
  request_order: number;
  local_token_count: number;
  token_start?: number;
  token_end?: number;
  estimated_cached_input_tokens?: number;
  estimated_uncached_input_tokens?: number;
  attribution_state: "complete" | "partial" | "unavailable" | "overlong_normalized" | "under_attributed" | "estimated";
  privacy: DashboardApiPrivacyState;
  caveats: AnalysisCaveat[];
};
```

```ts
type RequestUsageAvailability = {
  status: "complete" | "partial" | "unavailable";
  usage_status: "reported" | "missing" | "incomplete";
  attribution_status: "complete" | "partial" | "unavailable" | "not_applicable";
  missing_facts: string[];
  limitations: string[];
  reason?: string;
};
```

## Dashboard API Additions

### `GET /api/status`

Additive capability:

```ts
capabilities: {
  sessions: true;
  run_view: true;
  artifact_detail: true;
  request_accounting: true;
  refresh: "request";
}
```

### `GET /api/sessions?limit=20`

Each session may include identity mapping metadata:

```ts
type DashboardApiSession = {
  run_id: string;
  canonical_run_id?: string;
  label?: string;
  identity: SessionIdentityMapping;
  availability: AnalyzerAvailability;
  caveats: DashboardApiCaveat[];
};
```

`run_id` remains the routable key for `GET /api/runs/:runId`.

### `GET /api/runs/:runId`

Additive field on `DashboardApiRun`:

```ts
type DashboardApiRun = {
  run_id: string;
  canonical_run_id?: string;
  overview: DashboardApiRunOverview;
  requests: DashboardApiRequestAccounting;
  artifacts: DashboardApiArtifactRow[];
  artifact_details: Record<string, DashboardApiArtifactDetail>;
  task_groups: DashboardApiTaskGroup[];
  filters: DashboardApiFilterOptions;
  privacy: DashboardApiPrivacyState;
  caveats: DashboardApiCaveat[];
};
```

```ts
type DashboardApiRequestAccounting = {
  availability: AnalyzerAvailability;
  summary: RequestAccountingResult["summary"];
  rows: DashboardApiRequestAccountingRow[];
  caveats: DashboardApiCaveat[];
};
```

Dashboard API rows mirror analyzer rows but use API-owned privacy/caveat types and only include dashboard-safe display labels.
The analyzer-only `metrics` object is not required in the dashboard API payload because the dashboard contract exposes the same user-facing counts under `summary`.

### Optional Future Endpoint: `GET /api/runs/:runId/requests/:requestId`

May return one request row when the UI needs focused refresh or if the full run response becomes too large.

Expected status:

- `200` for known request.
- `404` for unknown run or request.
- `422` when the run cannot be interpreted.

## Session Identity Mapping

```ts
type SessionIdentityMapping = {
  route_run_id: string;
  canonical_run_id?: string;
  codex_session_id?: string;
  codex_conversation_id?: string;
  codex_label?: string;
  mapping_confidence: "one_to_one" | "probable" | "best_effort" | "unknown";
  mapping_source:
    | "direct_session_id"
    | "cache_key"
    | "wrapper_header"
    | "rollout_time_index"
    | "fallback_fingerprint"
    | "unavailable";
  limitations: string[];
};
```

## Sorting Rules

Request rows sort by:

1. Known timestamp ascending.
2. Missing timestamps after known timestamps.
3. Canonical request identifier ascending for ties.

Artifact inclusions within a request sort by:

1. `artifact_index` ascending when present.
2. `token_start` ascending when present.
3. Event order or artifact identifier as deterministic fallback.

## Privacy Rules

- No request row or artifact inclusion includes raw prompt, file, command, tool output, or message body content.
- Metadata-only captures still produce request rows when usage or metadata exists.
- Preview/raw availability can be represented only through privacy state and existing safe preview rules.
- Search/display labels must use dashboard-safe labels from analyzer/legibility mapping or safe metadata.

## Contract Validation

Required validation scenarios:

- Multiple provider usage records produce chronological request rows with exact input, cached input, uncached input, output, and total token values.
- Two requests with identical timestamps sort deterministically by request ID.
- A request with artifacts but no usage is present with unavailable or partial usage and no fabricated token totals.
- A request with usage but no artifacts is present with provider totals and an empty inclusion list.
- Request artifact inclusions preserve request order and local token counts.
- Artifact inclusion attribution appears only when provider usage and local offsets allow it; otherwise attribution is partial or unavailable.
- Metadata-only fixtures contain no hidden raw content in request rows or inclusions.
- Dashboard sessions expose route identity separately from Codex/session diagnostics and disclose non-one-to-one mappings.
- Browser/dashboard package tests or boundary checks prove request totals are consumed from API fields rather than recomputed.
