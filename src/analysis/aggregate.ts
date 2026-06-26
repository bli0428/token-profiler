import { validateEvent } from "../core/events/index.ts";

export function aggregateEvents(events) {
  const canonicalEvents = events.map((event) => validateEvent(event));
  const usageEvents = canonicalEvents.filter((event) => event.event_kind === "request_usage");
  const artifactEvents = canonicalEvents.filter((event) => event.event_kind === "artifact");
  const sortedEvents = [...artifactEvents].sort((a, b) => {
    const timeComparison = String(a.timestamp).localeCompare(String(b.timestamp));
    return timeComparison || String(a.request_id).localeCompare(String(b.request_id));
  });

  const seenHashes = new Set();
  const artifactMap = new Map();
  const requestMap = new Map();
  let totalExposure = 0;
  let uniqueExposure = 0;

  for (const event of sortedEvents) {
    const tokenCount = Number(event.local_token_count) || 0;
    const firstHashInclusion = !seenHashes.has(event.content_hash);

    totalExposure += tokenCount;

    if (firstHashInclusion) {
      uniqueExposure += tokenCount;
      seenHashes.add(event.content_hash);
    }

    const artifactKey = event.artifact_id;
    const artifact = artifactMap.get(artifactKey) ?? {
      artifact_id: event.artifact_id,
      artifact_type: event.artifact_type,
      artifact_name: event.artifact_name,
      total_exposure: 0,
      unique_exposure: 0,
      repeated_exposure: 0,
      inclusions: 0,
      distinct_hashes: new Set(),
      estimated_cached_input_tokens: 0,
      estimated_uncached_input_tokens: 0,
      estimated_cache_attributed_tokens: 0,
      metadata: {},
      first_seen_at: event.timestamp,
      last_seen_at: event.timestamp
    };

    artifact.total_exposure += tokenCount;
    artifact.inclusions += 1;
    artifact.last_seen_at = event.timestamp;
    artifact.distinct_hashes.add(event.content_hash);
    artifact.metadata = mergeMetadata(artifact.metadata, event.metadata);

    if (firstHashInclusion) {
      artifact.unique_exposure += tokenCount;
    } else {
      artifact.repeated_exposure += tokenCount;
    }

    artifactMap.set(artifactKey, artifact);

    const request = requestMap.get(event.request_id) ?? {
      request_id: event.request_id,
      total_exposure: 0,
      artifacts: [],
      timestamp: event.timestamp
    };

    request.total_exposure += tokenCount;
    request.artifacts.push({
      artifact_id: event.artifact_id,
      artifact_type: event.artifact_type,
      artifact_name: event.artifact_name,
      token_count: tokenCount,
      content_hash: event.content_hash,
      metadata: event.metadata,
      token_start: finiteNumber(event.token_start),
      token_end: finiteNumber(event.token_end),
      artifact_index: Number.isInteger(event.artifact_index) ? event.artifact_index : undefined
    });

    requestMap.set(event.request_id, request);
  }

  const repeatedExposure = totalExposure - uniqueExposure;
  const requestUsage = new Map();
  for (const event of usageEvents) requestUsage.set(event.request_id, event);
  let inputTokens = 0;
  let cachedInputTokens = 0;
  let outputTokens = 0;
  let estimatedCachedInputTokens = 0;
  let estimatedUncachedInputTokens = 0;
  let estimatedCacheAttributedTokens = 0;

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
    }

    requestMap.set(usage.request_id, request);
  }

  const artifacts = [...artifactMap.values()]
    .map((artifact) => ({
      ...artifact,
      display_name: artifact.metadata?.display_name ?? artifact.artifact_name,
      distinct_hashes: artifact.distinct_hashes.size,
      replay_ratio: ratio(artifact.repeated_exposure, artifact.total_exposure),
      exposure_share: ratio(artifact.total_exposure, totalExposure),
      estimated_cache_hit_ratio: ratio(
        artifact.estimated_cached_input_tokens,
        artifact.estimated_cache_attributed_tokens
      )
    }))
    .sort((a, b) => b.total_exposure - a.total_exposure);

  return {
    totals: {
      total_exposure: totalExposure,
      unique_exposure: uniqueExposure,
      repeated_exposure: repeatedExposure,
      replay_ratio: ratio(repeatedExposure, totalExposure),
      context_efficiency: ratio(uniqueExposure, totalExposure),
      artifact_count: artifacts.length,
      request_count: requestMap.size,
      usage_request_count: requestUsage.size,
      input_tokens: inputTokens,
      cached_input_tokens: cachedInputTokens,
      uncached_input_tokens: Math.max(0, inputTokens - cachedInputTokens),
      output_tokens: outputTokens,
      cache_hit_ratio: ratio(cachedInputTokens, inputTokens),
      estimated_cached_input_tokens: estimatedCachedInputTokens,
      estimated_uncached_input_tokens: estimatedUncachedInputTokens,
      estimated_cache_attributed_tokens: estimatedCacheAttributedTokens,
      estimated_cache_attribution_coverage: ratio(estimatedCacheAttributedTokens, inputTokens)
    },
    artifacts,
    cost_drivers: [...artifacts]
      .filter((artifact) => artifact.estimated_cache_attributed_tokens > 0)
      .sort((a, b) => b.estimated_uncached_input_tokens - a.estimated_uncached_input_tokens)
      .slice(0, 10),
    context_bloat: [...artifacts]
      .sort((a, b) => b.repeated_exposure - a.repeated_exposure)
      .slice(0, 10),
    top_contributors: artifacts.slice(0, 10),
    replay_hotspots: [...artifacts]
      .sort((a, b) => b.repeated_exposure - a.repeated_exposure)
      .slice(0, 10),
    requests: [...requestMap.values()].sort((a, b) =>
      String(a.timestamp).localeCompare(String(b.timestamp))
    )
  };
}

function ratio(numerator, denominator) {
  return denominator === 0 ? 0 : numerator / denominator;
}

function attributeRequestCache(request, usage) {
  const artifacts = [];
  let cached = 0;
  let uncached = 0;
  let total = 0;
  const inputTokens = Math.max(0, Number(usage?.input_tokens) || 0);
  const cachedInputTokens = Math.min(inputTokens, Math.max(0, Number(usage?.cached_input_tokens) || 0));
  const coordinateTokens = request.artifacts.reduce((maxEnd, artifact) => {
    const tokenStart = finiteNumber(artifact.token_start);
    const tokenEnd = finiteNumber(artifact.token_end);
    return tokenStart === undefined || tokenEnd === undefined || tokenEnd < tokenStart
      ? maxEnd
      : Math.max(maxEnd, tokenEnd);
  }, 0);
  const coordinateScale = coordinateTokens > inputTokens && inputTokens > 0
    ? inputTokens / coordinateTokens
    : 1;

  for (const artifact of request.artifacts) {
    const tokenStart = finiteNumber(artifact.token_start);
    const tokenEnd = finiteNumber(artifact.token_end);
    const tokenCount = Number(artifact.token_count) || 0;
    if (tokenStart === undefined || tokenEnd === undefined || tokenEnd < tokenStart) continue;

    const normalizedStart = tokenStart * coordinateScale;
    const normalizedEnd = tokenEnd * coordinateScale;
    const normalizedTokens = Math.max(0, normalizedEnd - normalizedStart);
    const cachedTokens = Math.max(0, Math.min(normalizedEnd, cachedInputTokens) - normalizedStart);
    const attributedCached = Math.min(normalizedTokens, cachedTokens);
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
    artifacts,
    request: {
      estimated_cached_input_tokens: cached,
      estimated_uncached_input_tokens: uncached,
      estimated_cache_attributed_tokens: total,
      estimated_cache_hit_ratio: ratio(cached, total),
      attribution_coverage: ratio(total, request.usage?.input_tokens ?? 0)
    }
  };
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function mergeMetadata(current = {}, next = {}) {
  if (!next || typeof next !== "object") return current;
  const merged = { ...current };
  for (const [key, value] of Object.entries(next)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      const existing = Array.isArray(merged[key]) ? merged[key] : [];
      merged[key] = [...new Set([...existing, ...value])];
      continue;
    }
    if (key === "display_name" && shouldReplaceDisplayName(merged[key], value, merged, next)) {
      merged[key] = value;
      continue;
    }
    if (merged[key] === undefined) merged[key] = value;
  }
  return merged;
}

function shouldReplaceDisplayName(current, next, currentMetadata, nextMetadata) {
  if (current === undefined) return true;
  return metadataSpecificity(nextMetadata) > metadataSpecificity(currentMetadata)
    || (isGenericDisplayName(current) && !isGenericDisplayName(next));
}

function metadataSpecificity(metadata: Record<string, any> = {}) {
  let score = 0;
  if (metadata.command) score += 4;
  if (metadata.touched_files?.length > 0) score += 3;
  if (metadata.output_preview) score += 2;
  if (metadata.source_display_name) score += 2;
  if (metadata.content_kind) score += 1;
  if (metadata.tool_name) score += 1;
  return score;
}

function isGenericDisplayName(value) {
  const text = String(value ?? "");
  return /^tool:[^:]+:call_/.test(text)
    || /^tool-call:[^:]+:call_/.test(text)
    || /^input:[^:]+:\d+$/.test(text);
}
