import type {
  AnalysisCaveat,
  ProviderRequestUsage,
  RequestAccountingResult,
  RequestAccountingRow,
  RequestArtifactInclusion,
  RequestCacheAttributionSummary,
  RequestUsageAvailability
} from "./types.ts";
import type { PreparedRunData } from "./types.ts";
import type { RequestArtifactSummary, RequestSummary } from "../core/events/types.ts";
import { localAttributionCaveat, partialDataCaveat } from "./caveats.ts";
import { attributeRequestCache } from "./cache-attribution.ts";
import { finiteNumber, ratio } from "./exposure.ts";

export function analyzeRequestAccounting(
  runData: PreparedRunData,
  requests: RequestSummary[]
): RequestAccountingResult {
  const requestMap = new Map<string, RequestSummary>();
  for (const request of requests) {
    requestMap.set(request.request_id, {
      ...request,
      artifacts: [...request.artifacts]
    });
  }

  for (const usage of runData.usageEvents) {
    if (requestMap.has(usage.request_id)) continue;
    requestMap.set(usage.request_id, {
      request_id: usage.request_id,
      total_exposure: 0,
      artifacts: [],
      timestamp: usage.timestamp,
      usage: {
        input_tokens: Number(usage.input_tokens) || 0,
        cached_input_tokens: Number(usage.cached_input_tokens) || 0,
        uncached_input_tokens: Number(usage.uncached_input_tokens) || 0,
        output_tokens: Number(usage.output_tokens) || 0,
        ...(usage.reasoning_tokens !== undefined ? { reasoning_tokens: Number(usage.reasoning_tokens) || 0 } : {}),
        cache_hit_ratio: ratio(usage.cached_input_tokens, usage.input_tokens)
      }
    });
  }

  const usageByRequest = new Map(runData.usageEvents.map((event) => [event.request_id, event]));
  const rows = [...requestMap.values()].sort(compareRequests).map((request, index) =>
    requestAccountingRow(request, usageByRequest.get(request.request_id), index)
  );
  const usageIncompleteCount = rows.filter((row) => row.availability.usage_status !== "reported").length;
  const caveats: AnalysisCaveat[] = [];

  if (usageIncompleteCount > 0) {
    caveats.push(partialDataCaveat(
      "request_usage_unavailable",
      "Some requests are missing provider usage, so request accounting is partial.",
      "request-accounting"
    ));
  }
  if (rows.some((row) => row.artifact_inclusions.some((inclusion) => inclusion.estimated_cached_input_tokens !== undefined || inclusion.estimated_uncached_input_tokens !== undefined))) {
    caveats.push(localAttributionCaveat("request-accounting"));
  }

  return {
    analyzer_id: "request-accounting",
    schema_version: 1,
    availability: rows.length === 0
      ? { status: "unavailable", reason: "No request records are available.", missing_facts: ["requests"] }
      : usageIncompleteCount > 0
        ? { status: "partial", reason: "Some requests are missing provider usage.", missing_facts: ["request_usage"] }
        : { status: "complete" },
    summary: {
      request_count: rows.length,
      usage_reported_count: rows.length - usageIncompleteCount,
      usage_incomplete_count: usageIncompleteCount,
      artifact_inclusion_count: rows.reduce((total, row) => total + row.artifact_count, 0),
      ...highestRequestIds(rows)
    },
    metrics: {
      request_count: rows.length,
      usage_reported_count: rows.length - usageIncompleteCount,
      usage_incomplete_count: usageIncompleteCount,
      artifact_inclusion_count: rows.reduce((total, row) => total + row.artifact_count, 0),
      highest_total_request_id: highestRequestIds(rows).highest_total_request_id ?? null,
      highest_uncached_request_id: highestRequestIds(rows).highest_uncached_request_id ?? null
    },
    rows,
    caveats
  };
}

function requestAccountingRow(
  request: RequestSummary,
  usageEvent: PreparedRunData["usageEvents"][number] | undefined,
  chronologyIndex: number
): RequestAccountingRow {
  const usage = usageEvent ? providerUsage(usageEvent) : undefined;
  const attribution = usage && request.usage ? attributeRequestCache(request, request.usage) : undefined;
  const inclusionAttribution = new Map((attribution?.artifacts ?? []).map((entry) => [entry.artifact_id, entry]));
  const caveats: AnalysisCaveat[] = [];
  const missingFacts: string[] = [];

  if (!usage) {
    missingFacts.push("request_usage");
    caveats.push({
      ...partialDataCaveat(
        "request_usage_unavailable",
        "Provider usage is unavailable for this request.",
        "request-accounting"
      ),
      applies_to: { analyzer_id: "request-accounting", request_id: request.request_id }
    });
  }

  const artifactsWithOffsets = request.artifacts.filter(hasUsableOffsets).length;
  const attributionStatus = attributionStatusForRequest(request, usage !== undefined, artifactsWithOffsets);
  if (attributionStatus === "partial" || attributionStatus === "unavailable") {
    missingFacts.push("artifact_offsets");
    caveats.push({
      ...partialDataCaveat(
        "artifact_offsets_unavailable",
        "Some request artifacts are missing token offsets, so request-scoped attribution is partial.",
        "request-accounting"
      ),
      applies_to: { analyzer_id: "request-accounting", request_id: request.request_id }
    });
  }

  const availability: RequestUsageAvailability = {
    status: usage && (attributionStatus === "complete" || attributionStatus === "not_applicable") ? "complete" : "partial",
    usage_status: usage ? "reported" : "missing",
    attribution_status: attributionStatus,
    missing_facts: uniqueStrings(missingFacts),
    limitations: [],
    ...(!usage ? { reason: "Provider usage is unavailable for this request." } : {})
  };

  const artifactInclusions = orderedArtifacts(request.artifacts).map((artifact, index) =>
    requestArtifactInclusion(
      artifact,
      index,
      inclusionAttribution.get(artifact.artifact_id),
      attribution?.request.attribution_state,
      caveats
    )
  );

  return {
    request_id: request.request_id,
    ...(request.timestamp ? { timestamp: request.timestamp } : {}),
    chronology_index: chronologyIndex,
    availability,
    ...(usage ? { usage } : {}),
    artifact_count: artifactInclusions.length,
    total_local_artifact_tokens: artifactInclusions.reduce((total, inclusion) => total + inclusion.local_token_count, 0),
    ...(attribution ? { cache_attribution: cacheAttributionSummary(attribution.request) } : {}),
    artifact_inclusions: artifactInclusions,
    caveats: uniqueCaveats(caveats)
  };
}

function providerUsage(usage: PreparedRunData["usageEvents"][number]): ProviderRequestUsage {
  return {
    input_tokens: Number(usage.input_tokens) || 0,
    cached_input_tokens: Number(usage.cached_input_tokens) || 0,
    uncached_input_tokens: Number(usage.uncached_input_tokens) || 0,
    output_tokens: Number(usage.output_tokens) || 0,
    ...(usage.reasoning_tokens !== undefined ? { reasoning_tokens: Number(usage.reasoning_tokens) || 0 } : {}),
    total_tokens: Number(usage.total_tokens) || 0,
    ...(usage.response_id ? { response_id: usage.response_id } : {}),
    source: "provider_reported"
  };
}

function requestArtifactInclusion(
  artifact: RequestArtifactSummary,
  fallbackOrder: number,
  attribution: { cached: number; uncached: number; total: number } | undefined,
  requestAttributionState: unknown,
  requestCaveats: AnalysisCaveat[]
): RequestArtifactInclusion {
  const tokenStart = finiteNumber(artifact.token_start);
  const tokenEnd = finiteNumber(artifact.token_end);
  const hasOffsets = tokenStart !== undefined && tokenEnd !== undefined && tokenEnd >= tokenStart;
  const estimated = attribution !== undefined;
  const caveats = estimated ? [localAttributionCaveat("request-accounting")] : [];
  if (!estimated && !hasOffsets) {
    caveats.push({
      ...partialDataCaveat(
        "artifact_offsets_unavailable",
        "Token offsets are unavailable for this request artifact.",
        "request-accounting"
      ),
      applies_to: { analyzer_id: "request-accounting", artifact_id: artifact.artifact_id }
    });
  }
  requestCaveats.push(...caveats);

  return {
    artifact_id: artifact.artifact_id,
    stable_short_id: stableShortId(artifact.artifact_id),
    artifact_type: artifact.artifact_type,
    display_name: displayName(artifact),
    display_category: displayCategory(artifact),
    request_order: Number.isInteger(artifact.artifact_index) ? Number(artifact.artifact_index) : fallbackOrder,
    local_token_count: Number(artifact.token_count) || 0,
    ...(tokenStart !== undefined ? { token_start: tokenStart } : {}),
    ...(tokenEnd !== undefined ? { token_end: tokenEnd } : {}),
    ...(attribution ? { normalized_estimated_input_tokens: attribution.total } : {}),
    ...(attribution ? { estimated_cached_input_tokens: attribution.cached } : {}),
    ...(attribution ? { estimated_uncached_input_tokens: attribution.uncached } : {}),
    attribution_state: estimated ? String(requestAttributionState ?? "estimated") as RequestArtifactInclusion["attribution_state"] : "unavailable",
    privacy: {
      storage_mode: String(artifact.metadata?.storage_mode ?? "metadata"),
      preview_state: "hidden",
      hidden_fields: ["raw_content"]
    },
    caveats: uniqueCaveats(caveats)
  };
}

function cacheAttributionSummary(value: Record<string, unknown>): RequestCacheAttributionSummary {
  return {
    estimated_cached_input_tokens: numberOrUndefined(value.estimated_cached_input_tokens),
    estimated_uncached_input_tokens: numberOrUndefined(value.estimated_uncached_input_tokens),
    normalized_estimated_input_tokens: numberOrUndefined(value.normalized_estimated_input_tokens),
    estimated_cache_hit_ratio: numberOrUndefined(value.estimated_cache_hit_ratio),
    attribution_coverage: numberOrUndefined(value.attribution_coverage),
    attribution_state: String(value.attribution_state ?? "estimated") as RequestCacheAttributionSummary["attribution_state"]
  };
}

function attributionStatusForRequest(request: RequestSummary, hasUsage: boolean, artifactOffsetCount: number): RequestUsageAvailability["attribution_status"] {
  if (!hasUsage || request.artifacts.length === 0) return "not_applicable";
  if (artifactOffsetCount === 0) return "unavailable";
  if (artifactOffsetCount < request.artifacts.length) return "partial";
  return "complete";
}

function compareRequests(a: RequestSummary, b: RequestSummary): number {
  const aTime = a.timestamp || "\uffff";
  const bTime = b.timestamp || "\uffff";
  return aTime.localeCompare(bTime) || a.request_id.localeCompare(b.request_id);
}

function orderedArtifacts(artifacts: RequestArtifactSummary[]): RequestArtifactSummary[] {
  return [...artifacts].sort((a, b) => {
    const indexA = Number.isInteger(a.artifact_index) ? Number(a.artifact_index) : Number.POSITIVE_INFINITY;
    const indexB = Number.isInteger(b.artifact_index) ? Number(b.artifact_index) : Number.POSITIVE_INFINITY;
    const startA = finiteNumber(a.token_start) ?? Number.POSITIVE_INFINITY;
    const startB = finiteNumber(b.token_start) ?? Number.POSITIVE_INFINITY;
    return indexA - indexB
      || startA - startB
      || String(a.artifact_id).localeCompare(String(b.artifact_id));
  });
}

function highestRequestIds(rows: RequestAccountingRow[]) {
  const withUsage = rows.filter((row) => row.usage);
  const highestTotal = [...withUsage].sort((a, b) =>
    Number(b.usage?.total_tokens ?? 0) - Number(a.usage?.total_tokens ?? 0)
    || a.request_id.localeCompare(b.request_id)
  )[0];
  const highestUncached = [...withUsage].sort((a, b) =>
    Number(b.usage?.uncached_input_tokens ?? 0) - Number(a.usage?.uncached_input_tokens ?? 0)
    || a.request_id.localeCompare(b.request_id)
  )[0];

  return {
    ...(highestTotal ? { highest_total_request_id: highestTotal.request_id } : {}),
    ...(highestUncached ? { highest_uncached_request_id: highestUncached.request_id } : {})
  };
}

function hasUsableOffsets(artifact: RequestArtifactSummary): boolean {
  const tokenStart = finiteNumber(artifact.token_start);
  const tokenEnd = finiteNumber(artifact.token_end);
  return tokenStart !== undefined && tokenEnd !== undefined && tokenEnd >= tokenStart;
}

function displayName(artifact: RequestArtifactSummary): string {
  return String(artifact.metadata?.display_name ?? artifact.metadata?.prompt_summary ?? artifact.artifact_name);
}

function displayCategory(artifact: RequestArtifactSummary): string {
  return String(artifact.metadata?.content_kind ?? artifact.artifact_type).toLowerCase();
}

function stableShortId(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, "").slice(0, 8) || value.slice(0, 8);
}

function numberOrUndefined(value: unknown): number | undefined {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function uniqueCaveats(caveats: AnalysisCaveat[]): AnalysisCaveat[] {
  const seen = new Set<string>();
  return caveats.filter((caveat) => {
    const key = `${caveat.code}:${caveat.applies_to?.request_id ?? ""}:${caveat.applies_to?.artifact_id ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
