import type { ArtifactDetailResponse, DashboardRun } from "../api/types";
import type { DashboardViewState } from "../state/view-state";
import { filterAndSortArtifacts } from "../utils/run-filters";
import { ArtifactDetailPanel } from "./ArtifactDetailPanel";
import { ArtifactTable } from "./ArtifactTable";
import { FiltersBar } from "./FiltersBar";
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
  const artifacts = filterAndSortArtifacts(run.artifacts, viewState);
  return (
    <section className="run-explorer" aria-label="Run explorer">
      <div className="run-main">
        <RunOverview overview={run.overview} lastUpdatedAt={lastUpdatedAt} />
        <TaskGroups
          taskGroups={run.task_groups}
          selectedTaskGroupId={viewState.selectedTaskGroupId}
          onSelect={(selectedTaskGroupId) => onChangeViewState({ selectedTaskGroupId, selectedArtifactId: undefined })}
        />
        <FiltersBar categories={run.filters.categories} state={viewState} onChange={onChangeViewState} />
        <ArtifactTable
          artifacts={artifacts}
          selectedArtifactId={viewState.selectedArtifactId}
          onSelect={(selectedArtifactId) => onChangeViewState({ selectedArtifactId })}
        />
      </div>
      <ArtifactDetailPanel detail={detail?.data} loading={detailLoading} errorMessage={detailError} />
    </section>
  );
}
