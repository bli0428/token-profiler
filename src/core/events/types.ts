export type JsonObject = Record<string, unknown>;

export type ArtifactEvent = {
  schema_version: number;
  event_kind: "artifact";
  run_id: string;
  request_id: string;
  artifact_id: string;
  artifact_type: string;
  artifact_name: string;
  content_hash: string;
  local_token_count: number;
  tokenizer: string;
  timestamp: string;
  storage_mode: "metadata" | "preview" | "raw";
  metadata: JsonObject;
  artifact_index?: number;
  token_start?: number;
  token_end?: number;
  preview?: JsonObject;
  content?: string;
};

export type RequestUsageEvent = {
  schema_version: number;
  event_kind: "request_usage";
  run_id: string;
  request_id: string;
  response_id?: string;
  input_tokens: number;
  cached_input_tokens: number;
  uncached_input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  timestamp: string;
};

export type CanonicalEvent = ArtifactEvent | RequestUsageEvent;

export type RequestArtifactSummary = {
  artifact_id: string;
  artifact_type: string;
  artifact_name: string;
  token_count: number;
  content_hash: string;
  metadata?: JsonObject;
  token_start?: number;
  token_end?: number;
  artifact_index?: number;
};

export type RequestSummary = {
  request_id: string;
  total_exposure: number;
  artifacts: RequestArtifactSummary[];
  timestamp: string;
  usage?: {
    input_tokens: number;
    cached_input_tokens: number;
    uncached_input_tokens: number;
    output_tokens: number;
    cache_hit_ratio: number;
  };
  cache_attribution?: JsonObject;
};

export type ArtifactAggregate = {
  artifact_id: string;
  artifact_type: string;
  artifact_name: string;
  total_exposure: number;
  unique_exposure: number;
  repeated_exposure: number;
  inclusions: number;
  distinct_hashes: any;
  estimated_cached_input_tokens: number;
  estimated_uncached_input_tokens: number;
  estimated_cache_attributed_tokens: number;
  metadata: JsonObject;
  first_seen_at: string;
  last_seen_at: string;
  display_name?: unknown;
  replay_ratio?: number;
  exposure_share?: number;
  estimated_cache_hit_ratio?: number;
};

export type AggregateSummary = {
  totals: JsonObject;
  artifacts: ArtifactAggregate[];
  cost_drivers: ArtifactAggregate[];
  context_bloat: ArtifactAggregate[];
  top_contributors: ArtifactAggregate[];
  replay_hotspots: ArtifactAggregate[];
  requests: RequestSummary[];
};
