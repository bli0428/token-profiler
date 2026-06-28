import type { ArtifactDetailResponse, DashboardRun, DashboardSession } from "../api/types";
import type { DashboardViewState } from "../state/view-state";
import { ArtifactDetailPanel } from "./ArtifactDetailPanel";
import { RequestList } from "./RequestList";
import { RunOverview } from "./RunOverview";

type Props = {
  run: DashboardRun;
  detail?: ArtifactDetailResponse;
  detailLoading: boolean;
  detailError?: string;
  viewState: DashboardViewState;
  session?: DashboardSession;
  lastUpdatedAt?: string;
  onChangeViewState: (next: Partial<DashboardViewState>) => void;
};

export function RunExplorer({ run, detail, detailLoading, detailError, viewState, session, lastUpdatedAt, onChangeViewState }: Props) {
  const title = session?.label ?? session?.identity.codex_label ?? run.run_id;
  const timestamp = session?.updated_at ?? lastUpdatedAt;

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
        <RunOverview overview={run.overview} title={title} timestamp={timestamp} />
        <RequestList
          requests={run.requests}
          artifactRows={run.artifacts}
          expandedRequestIds={viewState.expandedRequestIds}
          selectedArtifactId={viewState.selectedArtifactId}
          sortKey={viewState.requestSortKey}
          sortDirection={viewState.requestSortDirection}
          onSelectArtifact={(selectedArtifactId) => onChangeViewState({ selectedArtifactId })}
          onChangeSort={(next) => onChangeViewState({
            requestSortKey: next.sortKey ?? viewState.requestSortKey,
            requestSortDirection: next.sortDirection ?? viewState.requestSortDirection
          })}
          onToggleExpanded={toggleRequest}
        />
      </div>
      <ArtifactDetailPanel detail={detail?.data} loading={detailLoading} errorMessage={detailError} />
    </section>
  );
}
