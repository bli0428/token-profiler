import { LEGIBILITY_CAVEATS, legibilityCaveat, localAttributionCaveat } from "./caveats.ts";
import { compareReadableArtifacts, compareRequestsByTimestamp, compareTaskGroups, stableShortId } from "./sort.ts";
import type { RequestSummary } from "../core/events/types.ts";
import type {
  LegibilityAnalysisResult,
  TaskGroup,
  TaskGroupAnalysisResult,
  ToolCallLink
} from "./types.ts";

export function analyzeTaskGroups(
  requests: RequestSummary[],
  legibility: LegibilityAnalysisResult
): TaskGroupAnalysisResult {
  const orderedRequests = [...requests].sort(compareRequestsByTimestamp);
  const groups: TaskGroup[] = [];
  let current: RequestSummary[] = [];
  let currentPromptArtifactId: string | undefined;

  for (const request of orderedRequests) {
    const promptArtifact = request.artifacts.find((artifact) => {
      const metadata = artifact.metadata ?? {};
      return metadata.content_kind === "user_message" || metadata.role === "user";
    });
    if (promptArtifact && current.length > 0) {
      groups.push(buildGroup(current, currentPromptArtifactId, legibility));
      current = [];
    }
    if (promptArtifact) currentPromptArtifactId = promptArtifact.artifact_id;
    current.push(request);
  }
  if (current.length > 0) groups.push(buildGroup(current, currentPromptArtifactId, legibility));

  const artifactGroupCounts = new Map<string, number>();
  for (const group of groups) {
    for (const artifactId of group.artifact_ids) {
      artifactGroupCounts.set(artifactId, (artifactGroupCounts.get(artifactId) ?? 0) + 1);
    }
  }
  const crossGroupArtifactCount = [...artifactGroupCounts.values()].filter((count) => count > 1).length;

  return {
    analyzer_id: "task-groups",
    schema_version: 1,
    availability: groups.length === 0
      ? { status: "unavailable", reason: "No request records are available.", missing_facts: ["requests"] }
      : groups.some((group) => group.confidence !== "complete")
        ? { status: "partial", reason: "Some task boundaries are heuristic.", limitations: ["heuristic_grouping"] }
        : { status: "complete" },
    metrics: {
      task_group_count: groups.length,
      heuristic_group_count: groups.filter((group) => group.confidence === "heuristic").length,
      grouped_artifact_count: artifactGroupCounts.size,
      cross_group_artifact_count: crossGroupArtifactCount
    },
    rows: groups.sort(compareTaskGroups),
    caveats: groups.flatMap((group) => group.caveats)
  };
}

function buildGroup(
  requests: RequestSummary[],
  promptArtifactId: string | undefined,
  legibility: LegibilityAnalysisResult
): TaskGroup {
  const start = requests[0]!;
  const end = requests[requests.length - 1]!;
  const artifactIds = unique(requests.flatMap((request) => request.artifacts.map((artifact) => artifact.artifact_id)));
  const readableArtifacts = artifactIds
    .map((artifactId) => legibility.rows.find((row) => row.artifact_id === artifactId))
    .filter((row): row is NonNullable<typeof row> => row !== undefined);
  const promptArtifact = promptArtifactId
    ? legibility.rows.find((row) => row.artifact_id === promptArtifactId)
    : readableArtifacts.find((row) => row.display_category === "user_message");
  const promptAvailable = Boolean(promptArtifact && promptArtifact.display_category === "user_message" && promptArtifact.display_name !== "User message");
  const confidence: TaskGroup["confidence"] = promptArtifact ? "partial" : "heuristic";
  const caveats = [];
  if (!promptAvailable) {
    caveats.push(legibilityCaveat(
      LEGIBILITY_CAVEATS.privacyHidden,
      "Task prompt text was not stored; using a safe fallback label.",
      { analyzer_id: "task-groups", request_id: start.request_id }
    ));
  }
  if (confidence === "heuristic") {
    caveats.push(legibilityCaveat(
      LEGIBILITY_CAVEATS.taskGroupHeuristic,
      "Task boundaries were inferred from request order.",
      { analyzer_id: "task-groups", request_id: start.request_id }
    ));
  }
  if (requests.some((request) => request.usage)) caveats.push(localAttributionCaveat("task-groups"));

  const toolLinks = linksForArtifacts(legibility.tool_links, artifactIds);
  const seenHashes = new Set<string>();
  const totals = requests.reduce((acc, request) => {
    acc.total_exposure += request.total_exposure;
    for (const artifact of request.artifacts) {
      if (seenHashes.has(artifact.content_hash)) acc.repeated_exposure += Number(artifact.token_count) || 0;
      else seenHashes.add(artifact.content_hash);
    }
    acc.input_tokens += Number(request.usage?.input_tokens) || 0;
    acc.cached_input_tokens += Number(request.usage?.cached_input_tokens) || 0;
    acc.uncached_input_tokens += Number(request.usage?.uncached_input_tokens) || 0;
    acc.output_tokens += Number(request.usage?.output_tokens) || 0;
    return acc;
  }, {
    total_exposure: 0,
    repeated_exposure: 0,
    input_tokens: 0,
    cached_input_tokens: 0,
    uncached_input_tokens: 0,
    output_tokens: 0
  });

  return {
    task_group_id: `task:${stableShortId(start.request_id)}:${stableShortId(end.request_id)}`,
    display_name: promptAvailable
      ? promptArtifact!.display_name
      : `Task ${stableShortId(start.request_id, 6)}-${stableShortId(end.request_id, 6)}`,
    label_source: promptAvailable ? "safe_summary" : "fallback",
    confidence,
    start_request_id: start.request_id,
    end_request_id: end.request_id,
    request_ids: requests.map((request) => request.request_id),
    artifact_ids: artifactIds,
    tool_call_link_ids: toolLinks.map((link) => link.link_id),
    metrics: {
      input_tokens: totals.input_tokens || undefined,
      cached_input_tokens: totals.cached_input_tokens || undefined,
      uncached_input_tokens: totals.uncached_input_tokens || undefined,
      output_tokens: totals.output_tokens || undefined,
      total_exposure: totals.total_exposure,
      repeated_exposure: totals.repeated_exposure,
      artifact_count: artifactIds.length
    },
    top_artifact_ids: [...readableArtifacts].sort(compareReadableArtifacts).slice(0, 5).map((row) => row.artifact_id),
    privacy: {
      prompt_available: promptAvailable,
      preview_state: promptArtifact?.preview_state ?? "hidden",
      hidden_reason: promptAvailable ? undefined : "Prompt text unavailable in stored metadata."
    },
    caveats
  };
}

function linksForArtifacts(links: ToolCallLink[], artifactIds: string[]): ToolCallLink[] {
  const ids = new Set(artifactIds);
  return links.filter((link) =>
    (link.call_artifact_id && ids.has(link.call_artifact_id))
    || link.output_artifact_ids.some((artifactId) => ids.has(artifactId))
  );
}

function unique(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => String(a).localeCompare(String(b)));
}
