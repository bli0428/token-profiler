import type { ArtifactDetailResponse, DashboardRun } from "../api/types";
import type { DashboardViewState } from "../state/view-state";
import { ArtifactDetailPanel } from "./ArtifactDetailPanel";
import { RequestList } from "./RequestList";
import { RunOverview } from "./RunOverview";
import { TaskGroups } from "./TaskGroups";

type Props = {
  run: DashboardRun;
  detail?: ArtifactDetailResponse;
  detailLoading: boolean;
  detailError?: string;
  viewState: DashboardViewState;
  lastUpdatedAt?: string;
  onChangeViewState: (next: Partial<DashboardViewState>) => void;
};

export function RunExplorer({ run, detail, detailLoading, detailError, viewState, lastUpdatedAt, onChangeViewState }: Props) {
  const toggleRequest = (requestId: string) => {
    const expanded = new Set(viewState.expandedRequestIds);
    if (expanded.has(requestId)) {
      expanded.delete(requestId);
    } else {
      expanded.add(requestId);
    }
    onChangeViewState({ expandedRequestIds: Array.from(expanded) });
  };

  return (
    <section className="run-explorer" aria-label="Run explorer">
      <div className="run-main">
        <RunOverview overview={run.overview} lastUpdatedAt={lastUpdatedAt} />
        <TaskGroups
          taskGroups={run.task_groups}
          selectedTaskGroupId={viewState.selectedTaskGroupId}
          onSelect={(selectedTaskGroupId) => onChangeViewState({ selectedTaskGroupId, selectedArtifactId: undefined })}
        />
        <RequestList
          requests={run.requests}
          artifactRows={run.artifacts}
          expandedRequestIds={viewState.expandedRequestIds}
          selectedArtifactId={viewState.selectedArtifactId}
          onSelectArtifact={(selectedArtifactId) => onChangeViewState({ selectedArtifactId })}
          onToggleExpanded={toggleRequest}
        />
      </div>
      <ArtifactDetailPanel detail={detail?.data} loading={detailLoading} errorMessage={detailError} />
    </section>
  );
}
