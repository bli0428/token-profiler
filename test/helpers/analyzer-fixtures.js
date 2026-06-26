export function artifact(requestId, artifactId, artifactType, artifactName, contentHash, tokenCount, tokenStart, tokenEnd, metadata = {}) {
  return {
    schema_version: 1,
    run_id: "run_test",
    request_id: requestId,
    artifact_id: artifactId,
    artifact_type: artifactType,
    artifact_name: artifactName,
    content_hash: contentHash,
    local_token_count: tokenCount,
    tokenizer: "o200k_base",
    storage_mode: "metadata",
    event_kind: "artifact",
    metadata,
    token_start: tokenStart,
    token_end: tokenEnd,
    timestamp: `2026-06-23T12:00:0${requestId.at(-1)}.000Z`
  };
}

export function usage(requestId, inputTokens, cachedTokens, outputTokens = 10) {
  return {
    schema_version: 1,
    event_kind: "request_usage",
    run_id: "run_test",
    request_id: requestId,
    input_tokens: inputTokens,
    cached_input_tokens: cachedTokens,
    uncached_input_tokens: inputTokens - cachedTokens,
    output_tokens: outputTokens,
    total_tokens: inputTokens + outputTokens,
    timestamp: "2026-06-23T12:01:00.000Z"
  };
}
