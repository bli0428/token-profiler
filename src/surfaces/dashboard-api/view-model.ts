import type {
  AnalysisCaveat,
  ArtifactDetail,
  ReadableArtifact,
  RunAnalysisSummary,
  TaskGroup
} from "../../analysis/types.ts";
import type { JsonObject } from "../../core/events/types.ts";
import { dashboardPrivacyState, metadataRow, safeSearchText } from "./privacy.ts";
import type {
  DashboardViewArtifactDetail,
  DashboardViewArtifactRow,
  DashboardViewCaveat,
  DashboardViewRunOverview,
  DashboardViewSession,
  DashboardViewTaskGroup,
  DashboardViewModel
} from "./view-model-types.ts";

export function createDashboardViewModel(
  summary: RunAnalysisSummary,
  options: { session?: DashboardViewSession; runDir?: string } = {}
): DashboardViewModel {
  const taskGroups = dashboardTaskGroups(summary.task_groups ?? [], summary);
  const taskIdsByArtifact = mapTaskIdsByArtifact(taskGroups);
  const artifacts = dashboardArtifactRows(summary, taskIdsByArtifact);
  const details = dashboardArtifactDetails(summary.legibility?.details ?? [], taskIdsByArtifact);
  const categories = [...new Set(artifacts.map((row) => row.display_category))].sort();
  const caveats = uniqueCaveats(summary.caveats ?? []);
  const privacy = dashboardPrivacyState({
    storageMode: dominantStorageMode(artifacts),
    previewState: artifacts.some((row) => row.preview_state === "raw_available")
      ? "raw_available"
      : artifacts.some((row) => row.preview_state === "preview")
        ? "preview"
        : artifacts.some((row) => row.preview_state === "hidden")
          ? "hidden"
          : "unavailable",
    hiddenFields: artifacts.some((row) => row.preview_state === "hidden") ? ["raw_content"] : [],
    caveats: caveats.filter((caveat) => caveat.code.includes("privacy"))
  });

  return {
    schema_version: 1,
    ...(summary.run_id ? { run_id: summary.run_id } : {}),
    generated_at: summary.generated_at,
    ...(options.session ? { session: options.session } : {}),
    overview: dashboardOverview(summary, artifacts, caveats),
    artifacts,
    artifact_details: Object.fromEntries(details.map((detail) => [detail.artifact_id, detail])),
    task_groups: taskGroups,
    filters: {
      categories,
      task_groups: taskGroups.map((group) => ({
        task_group_id: group.task_group_id,
        display_name: group.display_name
      })),
      default_sort: "estimated_uncached",
      searchable_fields: ["display_name", "display_category", "stable_short_id", "summary"]
    },
    privacy,
    caveats
  };
}

export function dashboardOverview(
  summary: RunAnalysisSummary,
  artifacts: DashboardViewArtifactRow[],
  caveats: DashboardViewCaveat[],
  taskGroup?: DashboardViewTaskGroup
): DashboardViewRunOverview {
  if (taskGroup) {
    return {
      scope: "task_group",
      scope_id: taskGroup.task_group_id,
      scope_label: taskGroup.display_name,
      request_count: taskGroup.request_count,
      artifact_count: taskGroup.artifact_count,
      input_tokens: taskGroup.metrics.input_tokens,
      cached_input_tokens: taskGroup.metrics.cached_input_tokens,
      uncached_input_tokens: taskGroup.metrics.uncached_input_tokens,
      output_tokens: taskGroup.metrics.output_tokens,
      total_exposure: taskGroup.metrics.total_exposure,
      repeated_exposure: taskGroup.metrics.repeated_exposure,
      replay_ratio: ratio(taskGroup.metrics.repeated_exposure, taskGroup.metrics.total_exposure),
      context_efficiency: undefined,
      attribution_coverage: attributionCoverage(summary),
      availability: { status: taskGroup.confidence === "complete" ? "complete" : "partial" },
      caveats: uniqueCaveats([...taskGroup.caveats, ...caveats])
    };
  }

  return {
    scope: "run",
    scope_label: "Full run",
    request_count: summary.requests.length,
    artifact_count: artifacts.length,
    input_tokens: numberField(summary.totals, "input_tokens"),
    cached_input_tokens: numberField(summary.totals, "cached_input_tokens"),
    uncached_input_tokens: numberField(summary.totals, "uncached_input_tokens"),
    output_tokens: numberField(summary.totals, "output_tokens"),
    total_exposure: numberField(summary.totals, "total_exposure") ?? 0,
    repeated_exposure: numberField(summary.totals, "repeated_exposure") ?? 0,
    replay_ratio: numberField(summary.totals, "replay_ratio"),
    context_efficiency: numberField(summary.totals, "context_efficiency"),
    attribution_coverage: attributionCoverage(summary),
    availability: { status: "complete" },
    caveats
  };
}

function dashboardArtifactRows(
  summary: RunAnalysisSummary,
  taskIdsByArtifact: Map<string, string[]>
): DashboardViewArtifactRow[] {
  const readableById = new Map((summary.legibility?.rows ?? []).map((row: ReadableArtifact) => [row.artifact_id, row]));

  return summary.artifacts.map((aggregate) => {
    const readable = readableById.get(aggregate.artifact_id);
    const privacy = dashboardPrivacyState({
      storageMode: readable?.storage_mode ?? "metadata",
      previewState: readable?.preview_state ?? "hidden",
      hiddenFields: readable?.preview_state === "hidden" ? ["raw_content"] : [],
      caveats: readable?.caveats ?? []
    });
    const displayName = readable?.display_name ?? String(aggregate.display_name ?? aggregate.artifact_name);
    const summaryText = readable?.summary;
    const caveats = uniqueCaveats(readable?.caveats ?? []);
    const estimatedCached = aggregate.estimated_cached_input_tokens || undefined;
    const estimatedUncached = aggregate.estimated_uncached_input_tokens || undefined;

    return {
      artifact_id: aggregate.artifact_id,
      stable_short_id: readable?.stable_short_id ?? aggregate.artifact_id.slice(0, 8),
      display_name: displayName,
      display_category: readable?.display_category ?? aggregate.artifact_type,
      ...(summaryText ? { summary: summaryText } : {}),
      task_group_ids: taskIdsByArtifact.get(aggregate.artifact_id) ?? [],
      total_exposure: aggregate.total_exposure,
      repeated_exposure: aggregate.repeated_exposure,
      inclusion_count: aggregate.inclusions,
      ...(estimatedCached !== undefined ? { estimated_cached_input_tokens: estimatedCached } : {}),
      ...(estimatedUncached !== undefined ? { estimated_uncached_input_tokens: estimatedUncached } : {}),
      ...(readable?.attribution_state ? { attribution_state: readable.attribution_state } : {}),
      preview_state: readable?.preview_state ?? "hidden",
      detail_available: Boolean(summary.legibility?.details.some((detail) => detail.artifact_id === aggregate.artifact_id)),
      search_text: safeSearchText([
        displayName,
        readable?.display_category,
        readable?.stable_short_id,
        summaryText
      ], privacy),
      caveats
    };
  }).sort(compareDashboardRows);
}

function dashboardArtifactDetails(
  details: ArtifactDetail[],
  taskIdsByArtifact: Map<string, string[]>
): DashboardViewArtifactDetail[] {
  return details.map((detail) => {
    const privacy = dashboardPrivacyState({
      storageMode: detail.privacy.storage_mode,
      previewState: detail.privacy.preview_state,
      hiddenFields: detail.privacy.hidden_fields,
      caveats: detail.caveats.filter((caveat) => caveat.code.includes("privacy"))
    });
    const sections = [];

    sections.push({
      title: "Identity",
      rows: [
        metadataRow("Artifact ID", detail.artifact_id, privacy, "artifact_id"),
        metadataRow("Short ID", detail.identity.stable_short_id, privacy, "stable_short_id"),
        metadataRow("Category", detail.display_category, privacy, "display_category"),
        metadataRow("Artifact Name", detail.identity.artifact_name, privacy, "artifact_name")
      ]
    });

    if (detail.command) {
      sections.push({
        title: "Command",
        rows: [
          metadataRow("Command", detail.command.command, privacy, "command"),
          metadataRow("Workdir", detail.command.workdir, privacy, "workdir"),
          metadataRow("Exit Code", detail.command.exit_code, privacy, "exit_code"),
          metadataRow("Output Preview", detail.command.output_preview, privacy, "output_preview")
        ]
      });
    }

    if (detail.patch) {
      sections.push({
        title: "Patch",
        rows: [
          metadataRow("Touched Files", detail.patch.touched_files?.join(", "), privacy, "touched_files"),
          metadataRow("File Count", detail.patch.touched_file_count, privacy, "patch_file_count"),
          metadataRow("Adds", detail.patch.adds, privacy, "patch_adds"),
          metadataRow("Updates", detail.patch.updates, privacy, "patch_updates"),
          metadataRow("Deletes", detail.patch.deletes, privacy, "patch_deletes")
        ]
      });
    }

    const preview = detail.command?.output_preview;
    const content = privacy.storage_mode !== "metadata" && preview
      ? { preview, raw_reveal_required: detail.privacy.preview_state === "raw_available" }
      : undefined;

    return {
      artifact_id: detail.artifact_id,
      title: detail.display_name,
      identity: {
        artifact_name: detail.identity.artifact_name,
        stable_short_id: detail.identity.stable_short_id,
        display_category: detail.display_category,
        request_ids: detail.identity.request_ids
      },
      metrics: {
        total_exposure: detail.metrics.total_exposure,
        repeated_exposure: detail.metrics.repeated_exposure,
        inclusion_count: detail.metrics.inclusion_count,
        distinct_hash_count: detail.metrics.distinct_hash_count,
        estimated_cached_input_tokens: detail.metrics.estimated_cached_input_tokens,
        estimated_uncached_input_tokens: detail.metrics.estimated_uncached_input_tokens,
        attribution_state: detail.metrics.attribution_state,
        first_seen_at: detail.persistence.first_seen_at,
        last_seen_at: detail.persistence.last_seen_at
      },
      metadata_sections: sections,
      tool_links: detail.tool_links,
      task_group_ids: taskIdsByArtifact.get(detail.artifact_id) ?? [],
      privacy,
      ...(content ? { content } : {}),
      caveats: uniqueCaveats(detail.caveats)
    };
  });
}

function dashboardTaskGroups(groups: TaskGroup[], summary: RunAnalysisSummary): DashboardViewTaskGroup[] {
  return groups.map((group) => ({
    task_group_id: group.task_group_id,
    display_name: group.display_name,
    label_source: group.label_source,
    confidence: group.confidence,
    request_count: group.request_ids.length,
    artifact_count: group.artifact_ids.length,
    request_ids: group.request_ids,
    artifact_ids: group.artifact_ids,
    top_artifact_ids: group.top_artifact_ids,
    metrics: {
      input_tokens: group.metrics.input_tokens,
      cached_input_tokens: group.metrics.cached_input_tokens,
      uncached_input_tokens: group.metrics.uncached_input_tokens,
      output_tokens: group.metrics.output_tokens,
      total_exposure: group.metrics.total_exposure,
      repeated_exposure: group.metrics.repeated_exposure
    },
    privacy: dashboardPrivacyState({
      storageMode: group.privacy.preview_state === "hidden" ? "metadata" : "preview",
      previewState: group.privacy.preview_state,
      hiddenFields: group.privacy.prompt_available ? [] : ["prompt"],
      caveats: group.caveats.filter((caveat) => caveat.code.includes("privacy"))
    }),
    caveats: uniqueCaveats(group.caveats)
  })).sort((a, b) => {
    const requestA = summary.requests.findIndex((request) => request.request_id === a.request_ids[0]);
    const requestB = summary.requests.findIndex((request) => request.request_id === b.request_ids[0]);
    return (requestA - requestB) || a.task_group_id.localeCompare(b.task_group_id);
  });
}

function mapTaskIdsByArtifact(groups: DashboardViewTaskGroup[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const group of groups) {
    for (const artifactId of group.artifact_ids) {
      const ids = map.get(artifactId) ?? [];
      ids.push(group.task_group_id);
      map.set(artifactId, ids);
    }
  }
  return map;
}

function compareDashboardRows(a: DashboardViewArtifactRow, b: DashboardViewArtifactRow): number {
  return (b.estimated_uncached_input_tokens ?? 0) - (a.estimated_uncached_input_tokens ?? 0)
    || b.total_exposure - a.total_exposure
    || b.repeated_exposure - a.repeated_exposure
    || b.inclusion_count - a.inclusion_count
    || a.display_category.localeCompare(b.display_category)
    || a.artifact_id.localeCompare(b.artifact_id);
}

function attributionCoverage(summary: RunAnalysisSummary): number | "partial" | "unavailable" {
  const input = numberField(summary.totals, "input_tokens");
  const attributed = summary.artifacts.reduce((total, artifact) => total + (artifact.estimated_cache_attributed_tokens || 0), 0);
  if (!input) return "unavailable";
  if (attributed === 0) return "partial";
  return Math.min(1, attributed / input);
}

function dominantStorageMode(rows: DashboardViewArtifactRow[]): string {
  if (rows.some((row) => row.preview_state === "raw_available")) return "raw";
  if (rows.some((row) => row.preview_state === "preview")) return "preview";
  return "metadata";
}

function numberField(record: JsonObject, key: string): number | undefined {
  const value = Number(record[key]);
  return Number.isFinite(value) ? value : undefined;
}

function ratio(numerator: number, denominator: number): number | undefined {
  return denominator > 0 ? numerator / denominator : undefined;
}

export function uniqueCaveats(caveats: AnalysisCaveat[]): AnalysisCaveat[] {
  const seen = new Set<string>();
  const result: AnalysisCaveat[] = [];
  for (const caveat of caveats) {
    const key = `${caveat.code}:${caveat.message}:${caveat.applies_to?.artifact_id ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(caveat);
  }
  return result;
}
