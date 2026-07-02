export type DashboardSortKey =
  | "display_name"
  | "display_category"
  | "total_exposure"
  | "repeated_exposure"
  | "inclusion_count"
  | "estimated_cached_input_tokens"
  | "estimated_uncached_input_tokens";

export type RequestSortKey = "time" | "input" | "output" | "cached_read" | "total_tokens" | "requests";

export type DashboardViewState = {
  selectedRunId?: string;
  selectedTaskGroupId?: string;
  selectedArtifactId?: string;
  expandedTurnIds: string[];
  expandedRequestIds: string[];
  expandedArtifactIds: string[];
  categoryFilter: string | "all";
  searchQuery: string;
  sortKey: DashboardSortKey;
  sortDirection: "asc" | "desc";
  requestSortKey: RequestSortKey;
  requestSortDirection: "asc" | "desc";
  refreshMode: "manual" | "interval";
};

export const defaultViewState: DashboardViewState = {
  expandedTurnIds: [],
  expandedRequestIds: [],
  expandedArtifactIds: [],
  categoryFilter: "all",
  searchQuery: "",
  sortKey: "total_exposure",
  sortDirection: "desc",
  requestSortKey: "time",
  requestSortDirection: "asc",
  refreshMode: "manual"
};

export function withSelectedRun(state: DashboardViewState, selectedRunId: string | undefined): DashboardViewState {
  return {
    ...state,
    selectedRunId,
    selectedTaskGroupId: undefined,
    selectedArtifactId: undefined,
    expandedTurnIds: [],
    expandedRequestIds: [],
    expandedArtifactIds: []
  };
}

export function toggleExpandedTurn(state: DashboardViewState, turnId: string): DashboardViewState {
  const expanded = new Set(state.expandedTurnIds);
  if (expanded.has(turnId)) {
    expanded.delete(turnId);
  } else {
    expanded.add(turnId);
  }
  return {
    ...state,
    expandedTurnIds: Array.from(expanded)
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
