import type { ArtifactAggregate, RequestArtifactSummary, RequestSummary } from "../core/events/types.ts";
import { localAttributionCaveat, partialDataCaveat } from "./caveats.ts";
import { finiteNumber, ratio } from "./exposure.ts";
import { compareArtifactsByMetric } from "./sort.ts";
import type { CacheAttributionAnalysis, PreparedRunData } from "./types.ts";

/**
 * Allocates provider-reported cache usage onto canonical artifact ranges.
 *
 * Provider input/cache totals remain authoritative at request level. Artifact
 * cached and uncached values are local estimates derived from token offsets,
 * so the result always carries an attribution caveat when usage is present.
 */
export function analyzeCacheAttribution(
  runData: PreparedRunData,
  artifacts: ArtifactAggregate[],
  requests: RequestSummary[]
): CacheAttributionAnalysis {
  const artifactMap = new Map(artifacts.map((artifact) => [artifact.artifact_id, { ...artifact }]));
  const requestMap = new Map(requests.map((request) => [request.request_id, { ...request, artifacts: [...request.artifacts] }]));
  const requestUsage = new Map<string, (typeof runData.usageEvents)[number]>();
  for (const event of runData.usageEvents) requestUsage.set(event.request_id, event);

  let inputTokens = 0;
  let cachedInputTokens = 0;
  let outputTokens = 0;
  let estimatedCachedInputTokens = 0;
  let estimatedUncachedInputTokens = 0;
  let estimatedCacheAttributedTokens = 0;
  let normalizedRequestCount = 0;
  let missingOffsetRequestCount = 0;

  for (const usage of requestUsage.values()) {
    inputTokens += Number(usage.input_tokens) || 0;
    cachedInputTokens += Number(usage.cached_input_tokens) || 0;
    outputTokens += Number(usage.output_tokens) || 0;

    const request = requestMap.get(usage.request_id) ?? {
      request_id: usage.request_id,
      total_exposure: 0,
      artifacts: [],
      timestamp: usage.timestamp
    };
    request.usage = {
      input_tokens: Number(usage.input_tokens) || 0,
      cached_input_tokens: Number(usage.cached_input_tokens) || 0,
      uncached_input_tokens: Number(usage.uncached_input_tokens) || 0,
      output_tokens: Number(usage.output_tokens) || 0,
      cache_hit_ratio: ratio(usage.cached_input_tokens, usage.input_tokens)
    };

    const attribution = attributeRequestCache(request, request.usage);
    if (attribution.coordinateScale < 1) normalizedRequestCount += 1;
    if (attribution.missingOffsets) missingOffsetRequestCount += 1;
    request.cache_attribution = attribution.request;
    estimatedCachedInputTokens += attribution.cached;
    estimatedUncachedInputTokens += attribution.uncached;
    estimatedCacheAttributedTokens += attribution.total;

    for (const artifactAttribution of attribution.artifacts) {
      const artifact = artifactMap.get(artifactAttribution.artifact_id);
      if (!artifact) continue;
      artifact.estimated_cached_input_tokens += artifactAttribution.cached;
      artifact.estimated_uncached_input_tokens += artifactAttribution.uncached;
      artifact.estimated_cache_attributed_tokens += artifactAttribution.total;
      artifact.estimated_cache_hit_ratio = ratio(
        artifact.estimated_cached_input_tokens,
        artifact.estimated_cache_attributed_tokens
      );
    }
    requestMap.set(usage.request_id, request);
  }

  const updatedArtifacts = [...artifactMap.values()];
  const caveats = requestUsage.size > 0 ? [localAttributionCaveat()] : [];
  if (missingOffsetRequestCount > 0) {
    caveats.push(partialDataCaveat(
      "artifact_offsets_unavailable",
      "Some requests have provider usage but no artifact token offsets, so artifact-level cache attribution is partial.",
      "cache-attribution"
    ));
  }

  return {
    totals: {
      request_count: requestMap.size,
      usage_request_count: requestUsage.size,
      input_tokens: inputTokens,
      cached_input_tokens: cachedInputTokens,
      // Provider uncached input is the non-cached portion of provider input tokens.
      uncached_input_tokens: Math.max(0, inputTokens - cachedInputTokens),
      output_tokens: outputTokens,
      cache_hit_ratio: ratio(cachedInputTokens, inputTokens),
      estimated_cached_input_tokens: estimatedCachedInputTokens,
      estimated_uncached_input_tokens: estimatedUncachedInputTokens,
      estimated_cache_attributed_tokens: estimatedCacheAttributedTokens,
      // Coverage: locally attributed artifact tokens divided by provider input tokens.
      estimated_cache_attribution_coverage: ratio(estimatedCacheAttributedTokens, inputTokens)
    },
    artifacts: updatedArtifacts,
    requests: [...requestMap.values()],
    cost_drivers: [...updatedArtifacts]
      .filter((artifact) => artifact.estimated_cache_attributed_tokens > 0)
      .sort(compareArtifactsByMetric("estimated_uncached_input_tokens"))
      .slice(0, 10),
    result: {
      analyzer_id: "cache-attribution",
      schema_version: 1,
      availability: requestUsage.size === 0
        ? { status: "unavailable", reason: "No provider usage records are available.", missing_facts: ["request_usage"] }
        : missingOffsetRequestCount > 0
          ? { status: "partial", reason: "Some requests are missing artifact token offsets.", missing_facts: ["artifact_offsets"] }
          : { status: "complete" },
      metrics: {
        input_tokens: inputTokens,
        cached_input_tokens: cachedInputTokens,
        uncached_input_tokens: Math.max(0, inputTokens - cachedInputTokens),
        estimated_cache_attributed_tokens: estimatedCacheAttributedTokens,
        estimated_cache_attribution_coverage: ratio(estimatedCacheAttributedTokens, inputTokens),
        normalized_request_count: normalizedRequestCount
      },
      rows: [...updatedArtifacts]
        .filter((artifact) => artifact.estimated_cache_attributed_tokens > 0)
        .sort(compareArtifactsByMetric("estimated_uncached_input_tokens"))
        .slice(0, 10),
      caveats
    },
    caveats
  };
}

/**
 * Estimates cached and uncached artifact tokens for a single request.
 *
 * The request's provider cache boundary is modeled as the first
 * `cached_input_tokens` in provider token coordinates. Each artifact's
 * normalized token range is intersected with that boundary to estimate cached
 * tokens; the remainder of the range is estimated uncached.
 */
function attributeRequestCache(request: RequestSummary, usage: NonNullable<RequestSummary["usage"]>) {
  const artifacts: Array<{ artifact_id: string; cached: number; uncached: number; total: number }> = [];
  let cached = 0;
  let uncached = 0;
  let total = 0;
  const inputTokens = Math.max(0, Number(usage?.input_tokens) || 0);
  const cachedInputTokens = Math.min(inputTokens, Math.max(0, Number(usage?.cached_input_tokens) || 0));
  const coordinateTokens = request.artifacts.reduce((maxEnd: number, artifact: RequestArtifactSummary) => {
    const tokenStart = finiteNumber(artifact.token_start);
    const tokenEnd = finiteNumber(artifact.token_end);
    return tokenStart === undefined || tokenEnd === undefined || tokenEnd < tokenStart
      ? maxEnd
      : Math.max(maxEnd, tokenEnd);
  }, 0);
  // If reconstructed artifact coordinates exceed provider input tokens, scale
  // them proportionally into provider coordinates before attribution.
  const coordinateScale = coordinateTokens > inputTokens && inputTokens > 0
    ? inputTokens / coordinateTokens
    : 1;
  let missingOffsets = request.artifacts.length > 0;

  for (const artifact of request.artifacts) {
    const tokenStart = finiteNumber(artifact.token_start);
    const tokenEnd = finiteNumber(artifact.token_end);
    if (tokenStart === undefined || tokenEnd === undefined || tokenEnd < tokenStart) continue;
    missingOffsets = false;

    const normalizedStart = tokenStart * coordinateScale;
    const normalizedEnd = tokenEnd * coordinateScale;
    // Normalized tokens are the artifact's estimated length in provider coordinates.
    const normalizedTokens = Math.max(0, normalizedEnd - normalizedStart);
    // Cached tokens are the overlap between the artifact range and provider cache boundary.
    const cachedTokens = Math.max(0, Math.min(normalizedEnd, cachedInputTokens) - normalizedStart);
    const attributedCached = Math.min(normalizedTokens, cachedTokens);
    // Uncached attribution is the portion of the normalized range outside the cached overlap.
    const attributedUncached = Math.max(0, normalizedTokens - attributedCached);

    cached += attributedCached;
    uncached += attributedUncached;
    total += normalizedTokens;
    artifacts.push({
      artifact_id: artifact.artifact_id,
      cached: attributedCached,
      uncached: attributedUncached,
      total: normalizedTokens
    });
  }

  return {
    cached,
    uncached,
    total,
    coordinateScale,
    missingOffsets,
    artifacts,
    request: {
      estimated_cached_input_tokens: cached,
      estimated_uncached_input_tokens: uncached,
      estimated_cache_attributed_tokens: total,
      estimated_cache_hit_ratio: ratio(cached, total),
      attribution_coverage: ratio(total, request.usage?.input_tokens ?? 0),
      attribution_state: coordinateScale < 1 ? "overlong_normalized" : ratio(total, request.usage?.input_tokens ?? 0) === 1 ? "exact_match" : "under_attributed"
    }
  };
}
