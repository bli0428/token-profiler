import type { DashboardRun, DashboardSession } from "../api/types";
import type { DashboardViewState } from "./view-state";

export type RefreshResult = "success" | "partial" | "stale" | "not-found" | "offline" | "version-mismatch";

export function reconcileSessions(state: DashboardViewState, sessions: DashboardSession[]): DashboardViewState {
  if (!state.selectedRunId) return state;
  return sessions.some((session) => session.run_id === state.selectedRunId)
    ? state
    : {
        ...state,
        selectedRunId: undefined,
        selectedTaskGroupId: undefined,
        selectedArtifactId: undefined,
        expandedTurnIds: [],
        expandedRequestIds: []
      };
}

export function reconcileRun(state: DashboardViewState, run: DashboardRun | undefined): DashboardViewState {
  if (!run) return { ...state, selectedTaskGroupId: undefined, selectedArtifactId: undefined, expandedTurnIds: [], expandedRequestIds: [] };
  const taskExists = !state.selectedTaskGroupId || run.task_groups.some((task) => task.task_group_id === state.selectedTaskGroupId);
  const artifactExists = !state.selectedArtifactId || run.artifacts.some((artifact) => artifact.artifact_id === state.selectedArtifactId);
  const turnIds = new Set(run.turns.map((turn) => turn.turn_id));
  const requestIds = new Set(run.turns.flatMap((turn) => turn.requests.map((request) => request.request_id)));
  return {
    ...state,
    selectedTaskGroupId: taskExists ? state.selectedTaskGroupId : undefined,
    selectedArtifactId: artifactExists ? state.selectedArtifactId : undefined,
    expandedTurnIds: state.expandedTurnIds.filter((turnId) => turnIds.has(turnId)),
    expandedRequestIds: state.expandedRequestIds.filter((requestId) => requestIds.has(requestId))
  };
}
