import type { DashboardArtifactRow } from "../api/types";
import type { DashboardSortKey, DashboardViewState } from "../state/view-state";

export function filterAndSortArtifacts(artifacts: DashboardArtifactRow[], state: DashboardViewState): DashboardArtifactRow[] {
  const query = state.searchQuery.trim().toLowerCase();
  return artifacts
    .filter((artifact) => !state.selectedTaskGroupId || artifact.task_group_ids.includes(state.selectedTaskGroupId))
    .filter((artifact) => state.categoryFilter === "all" || artifact.display_category === state.categoryFilter)
    .filter((artifact) => !query || artifact.search_text.toLowerCase().includes(query))
    .slice()
    .sort((left: DashboardArtifactRow, right: DashboardArtifactRow) => compareArtifacts(left, right, state.sortKey, state.sortDirection));
}

export function compareArtifacts(
  left: DashboardArtifactRow,
  right: DashboardArtifactRow,
  sortKey: DashboardSortKey,
  direction: "asc" | "desc"
): number {
  const multiplier = direction === "asc" ? 1 : -1;
  const leftValue = getSortValue(left, sortKey);
  const rightValue = getSortValue(right, sortKey);
  if (typeof leftValue === "number" && typeof rightValue === "number") {
    return (leftValue - rightValue) * multiplier;
  }
  return String(leftValue).localeCompare(String(rightValue)) * multiplier;
}

function getSortValue(artifact: DashboardArtifactRow, sortKey: DashboardSortKey): string | number {
  if (sortKey === "display_name" || sortKey === "display_category") return artifact[sortKey];
  return artifact[sortKey] ?? Number.NEGATIVE_INFINITY;
}
