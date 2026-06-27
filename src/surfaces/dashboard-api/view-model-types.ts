import type {
  AnalysisCaveat,
  AnalyzerAvailability,
  PreviewState,
  ToolCallLink
} from "../../analysis/types.ts";

export type DashboardViewCaveat = AnalysisCaveat;

export type DashboardViewSession = {
  run_id: string;
  run_dir: string;
  label?: string;
  updated_at?: string | undefined;
  request_count?: number | undefined;
  artifact_count?: number | undefined;
  input_tokens?: number | undefined;
  cached_input_tokens?: number | undefined;
  uncached_input_tokens?: number | undefined;
  output_tokens?: number | undefined;
  availability: AnalyzerAvailability;
  caveats: DashboardViewCaveat[];
};

export type DashboardViewPrivacyState = {
  storage_mode: string;
  raw_content_available: boolean;
  raw_content_revealed: boolean;
  preview_fields: string[];
  hidden_fields: string[];
  unavailable_fields: string[];
  caveats: DashboardViewCaveat[];
};

export type DashboardViewRunOverview = {
  scope: "run" | "task_group";
  scope_id?: string | undefined;
  scope_label: string;
  request_count: number;
  artifact_count: number;
  input_tokens?: number | undefined;
  cached_input_tokens?: number | undefined;
  uncached_input_tokens?: number | undefined;
  output_tokens?: number | undefined;
  total_exposure: number;
  repeated_exposure: number;
  replay_ratio?: number | undefined;
  context_efficiency?: number | undefined;
  attribution_coverage?: number | "partial" | "unavailable" | undefined;
  availability: AnalyzerAvailability;
  caveats: DashboardViewCaveat[];
};

export type DashboardViewArtifactRow = {
  artifact_id: string;
  stable_short_id: string;
  display_name: string;
  display_category: string;
  summary?: string | undefined;
  task_group_ids: string[];
  total_exposure: number;
  repeated_exposure: number;
  inclusion_count: number;
  estimated_cached_input_tokens?: number | undefined;
  estimated_uncached_input_tokens?: number | undefined;
  attribution_state?: string | undefined;
  preview_state: PreviewState;
  detail_available: boolean;
  search_text: string;
  caveats: DashboardViewCaveat[];
};

export type DashboardViewMetadataSection = {
  title: string;
  rows: Array<{
    label: string;
    value: string;
    visibility: "visible" | "hidden" | "unavailable";
  }>;
};

export type DashboardViewArtifactDetail = {
  artifact_id: string;
  title: string;
  identity: {
    artifact_name?: string | undefined;
    stable_short_id: string;
    display_category: string;
    request_ids: string[];
  };
  metrics: Record<string, number | string | boolean | undefined>;
  metadata_sections: DashboardViewMetadataSection[];
  tool_links: ToolCallLink[];
  task_group_ids: string[];
  privacy: DashboardViewPrivacyState;
  content?: {
    preview?: string | undefined;
    raw?: string | undefined;
    raw_reveal_required: boolean;
  };
  caveats: DashboardViewCaveat[];
};

export type DashboardViewTaskGroup = {
  task_group_id: string;
  display_name: string;
  label_source: string;
  confidence: "complete" | "partial" | "heuristic";
  request_count: number;
  artifact_count: number;
  request_ids: string[];
  artifact_ids: string[];
  top_artifact_ids: string[];
  metrics: {
    input_tokens?: number | undefined;
    cached_input_tokens?: number | undefined;
    uncached_input_tokens?: number | undefined;
    output_tokens?: number | undefined;
    total_exposure: number;
    repeated_exposure: number;
  };
  privacy: DashboardViewPrivacyState;
  caveats: DashboardViewCaveat[];
};

export type DashboardViewFilterOptions = {
  categories: string[];
  task_groups: Array<{ task_group_id: string; display_name: string }>;
  default_sort: "estimated_uncached" | "total_exposure" | "repeated_exposure" | "inclusion_count";
  searchable_fields: string[];
};

export type DashboardViewModel = {
  schema_version: 1;
  run_id?: string | undefined;
  generated_at: string;
  session?: DashboardViewSession;
  overview: DashboardViewRunOverview;
  artifacts: DashboardViewArtifactRow[];
  artifact_details: Record<string, DashboardViewArtifactDetail>;
  task_groups: DashboardViewTaskGroup[];
  filters: DashboardViewFilterOptions;
  privacy: DashboardViewPrivacyState;
  caveats: DashboardViewCaveat[];
};

export type DashboardViewSessionIndex = {
  schema_version: 1;
  generated_at: string;
  sessions: DashboardViewSession[];
  caveats: DashboardViewCaveat[];
};
