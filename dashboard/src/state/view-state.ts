export type DashboardSortKey =
  | "display_name"
  | "display_category"
  | "total_exposure"
  | "repeated_exposure"
  | "inclusion_count"
  | "estimated_cached_input_tokens"
  | "estimated_uncached_input_tokens";

export type DashboardViewState = {
  selectedRunId?: string;
  selectedTaskGroupId?: string;
  selectedArtifactId?: string;
  expandedRequestIds: string[];
  categoryFilter: string | "all";
  searchQuery: string;
  sortKey: DashboardSortKey;
  sortDirection: "asc" | "desc";
  refreshMode: "manual" | "interval";
};

export const defaultViewState: DashboardViewState = {
  expandedRequestIds: [],
  categoryFilter: "all",
  searchQuery: "",
  sortKey: "total_exposure",
  sortDirection: "desc",
  refreshMode: "manual"
};

export function withSelectedRun(state: DashboardViewState, selectedRunId: string | undefined): DashboardViewState {
  return {
    ...state,
    selectedRunId,
    selectedTaskGroupId: undefined,
    selectedArtifactId: undefined,
    expandedRequestIds: []
  };
}

export function toggleExpandedRequest(state: DashboardViewState, requestId: string): DashboardViewState {
  const expanded = new Set(state.expandedRequestIds);
  if (expanded.has(requestId)) {
    expanded.delete(requestId);
  } else {
    expanded.add(requestId);
  }
  return {
    ...state,
    expandedRequestIds: Array.from(expanded)
  };
}
