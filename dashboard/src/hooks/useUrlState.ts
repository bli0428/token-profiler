import { useEffect, useState } from "react";
import { defaultViewState, type DashboardViewState } from "../state/view-state";

export function useUrlState() {
  const [viewState, setViewState] = useState<DashboardViewState>(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      ...defaultViewState,
      selectedRunId: params.get("run") ?? undefined,
      selectedTaskGroupId: params.get("task") ?? undefined,
      selectedArtifactId: params.get("artifact") ?? undefined,
      expandedArtifactIds: params.get("artifact") ? [params.get("artifact") as string] : defaultViewState.expandedArtifactIds,
      categoryFilter: params.get("category") ?? defaultViewState.categoryFilter,
      searchQuery: params.get("q") ?? defaultViewState.searchQuery,
      sortKey: (params.get("sort") as DashboardViewState["sortKey"]) ?? defaultViewState.sortKey,
      sortDirection: (params.get("direction") as DashboardViewState["sortDirection"]) ?? defaultViewState.sortDirection,
      requestSortKey: (params.get("requestSort") as DashboardViewState["requestSortKey"]) ?? defaultViewState.requestSortKey,
      requestSortDirection: (params.get("requestDirection") as DashboardViewState["requestSortDirection"]) ?? defaultViewState.requestSortDirection,
      refreshMode: (params.get("refresh") as DashboardViewState["refreshMode"]) ?? defaultViewState.refreshMode
    };
  });

  useEffect(() => {
    const params = new URLSearchParams();
    if (viewState.selectedRunId) params.set("run", viewState.selectedRunId);
    if (viewState.selectedTaskGroupId) params.set("task", viewState.selectedTaskGroupId);
    if (viewState.selectedArtifactId) params.set("artifact", viewState.selectedArtifactId);
    if (viewState.categoryFilter !== "all") params.set("category", viewState.categoryFilter);
    if (viewState.searchQuery) params.set("q", viewState.searchQuery);
    if (viewState.sortKey !== defaultViewState.sortKey) params.set("sort", viewState.sortKey);
    if (viewState.sortDirection !== defaultViewState.sortDirection) params.set("direction", viewState.sortDirection);
    if (viewState.requestSortKey !== defaultViewState.requestSortKey) params.set("requestSort", viewState.requestSortKey);
    if (viewState.requestSortDirection !== defaultViewState.requestSortDirection) params.set("requestDirection", viewState.requestSortDirection);
    if (viewState.refreshMode !== defaultViewState.refreshMode) params.set("refresh", viewState.refreshMode);
    window.history.replaceState(null, "", `${window.location.pathname}${params.toString() ? `?${params}` : ""}`);
  }, [viewState]);

  return [viewState, setViewState] as const;
}
