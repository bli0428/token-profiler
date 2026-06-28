# Data Model: Request Accounting Contract

## RequestAccounting

Top-level request accounting collection for one dashboard run/session.

**Fields**

- `availability`: completeness of request usage and attribution facts for the collection.
- `requests`: ordered `RequestAccountingRow[]`.
- `summary`: derived counts such as request count, usage-complete count, incomplete count, highest-total request ID, and highest-uncached request ID.
- `caveats`: collection-level caveats, especially local attribution and missing facts.

**Validation Rules**

- Rows are ordered by timestamp ascending when known, then deterministic fallback by request identifier.
- Rows may include requests discovered from artifact events, usage events, or both.
- Collection totals must not fabricate missing request usage.

## RequestAccountingRow

One provider request within one captured session/run.

**Fields**

- `request_id`: stable canonical request identifier.
- `timestamp`: ISO timestamp when known.
- `chronology_index`: deterministic zero-based position after sorting.
- `availability`: `RequestUsageAvailability`.
- `usage`: provider-reported token totals when available.
- `artifact_count`: count of request-scoped inclusions.
- `total_local_artifact_tokens`: sum of local token counts for inclusions.
- `cache_attribution`: request-local estimated cache attribution summary when available.
- `artifact_inclusions`: `RequestArtifactInclusion[]`.
- `caveats`: row-level caveats.

**Validation Rules**

- `usage` is absent when provider usage is incomplete or unavailable.
- `usage.uncached_input_tokens` uses provider-reported value when present; if a future canonical source omits it but reports input and cached input, analyzer output may derive it only with an explicit source fact/caveat.
- `total_tokens` is provider-reported total when present; otherwise absent.
- Identical or missing timestamps do not make ordering nondeterministic.

## ProviderRequestUsage

Authoritative provider usage values for one completed request.

**Fields**

- `input_tokens`
- `cached_input_tokens`
- `uncached_input_tokens`
- `output_tokens`
- `total_tokens`
- `response_id`, optional diagnostic identifier.
- `source`: `"provider_reported"`.

**Validation Rules**

- Zero is valid only when reported by provider usage.
- Missing usage is represented by absence of this object plus availability state.
- Cached input cannot exceed input after normalization; inconsistent source data should produce a caveat rather than silent trust.

## RequestArtifactInclusion

One artifact's inclusion in one request.

**Fields**

- `artifact_id`
- `stable_short_id`
- `artifact_type`
- `display_name`
- `display_category`
- `request_order`
- `local_token_count`
- `token_start`, optional.
- `token_end`, optional.
- `estimated_cached_input_tokens`, optional.
- `estimated_uncached_input_tokens`, optional.
- `attribution_state`: `"complete" | "partial" | "unavailable" | "overlong_normalized" | "under_attributed" | "estimated"`.
- `privacy`: request-safe privacy state.
- `caveats`

**Validation Rules**

- `request_order` comes from canonical `artifact_index` when available and falls back to deterministic event order.
- Estimated cached/uncached fields are present only when provider usage and usable local token offsets exist.
- Inclusion rows must not include raw content or hidden preview fields.
- If opaque, encrypted, metadata-only, or offsetless content blocks attribution, the row remains present with partial/unavailable attribution.

## SessionIdentityMapping

Relationship between dashboard routing identity and Codex-facing identity.

**Fields**

- `route_run_id`: routable dashboard API run identifier.
- `canonical_run_id`, optional.
- `codex_session_id`, optional.
- `codex_conversation_id`, optional.
- `codex_label`, optional display/diagnostic label.
- `mapping_confidence`: `"one_to_one" | "probable" | "best_effort" | "unknown"`.
- `mapping_source`: `"direct_session_id" | "cache_key" | "wrapper_header" | "rollout_time_index" | "fallback_fingerprint" | "unavailable"`.
- `limitations`: human-readable source limitations.

**Validation Rules**

- `route_run_id` remains the API route key and must not be replaced by Codex identity.
- When one-to-one identity cannot be proven, `mapping_confidence` is not `"one_to_one"` and limitations are populated.
- Absolute local paths are not required for this mapping.

## RequestUsageAvailability

Completeness state for one request's usage and attribution.

**Fields**

- `status`: `"complete" | "partial" | "unavailable"`.
- `usage_status`: `"reported" | "missing" | "incomplete"`.
- `attribution_status`: `"complete" | "partial" | "unavailable" | "not_applicable"`.
- `missing_facts`: array of missing canonical facts, such as `request_usage`, `artifact_offsets`, or `artifact_events`.
- `limitations`: source limitations such as opaque content or uncertain session identity.
- `reason`: short user-facing explanation.

**Validation Rules**

- Missing provider usage makes `usage_status` `"missing"` or `"incomplete"` and prevents numeric provider totals from appearing.
- Missing artifact offsets can make attribution partial without invalidating provider usage totals.
- Metadata-only captures can be complete for request usage while partial for artifact attribution.
