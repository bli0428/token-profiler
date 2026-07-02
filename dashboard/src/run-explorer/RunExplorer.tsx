import type { ArtifactDetailResponse, DashboardRun, DashboardSession } from "../api/types";
import type { DashboardViewState } from "../state/view-state";
import { RunOverview } from "./RunOverview";
import { TurnList } from "./TurnList";

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

  const toggleTurn = (turnId: string) => {
    const expanded = new Set(viewState.expandedTurnIds);
    if (expanded.has(turnId)) {
      expanded.delete(turnId);
    } else {
      expanded.add(turnId);
    }
    onChangeViewState({ expandedTurnIds: Array.from(expanded) });
  };

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
        <RunOverview artifacts={run.artifacts} overview={run.overview} title={title} timestamp={timestamp} />
        <TurnList
          turns={run.turns}
          artifactRows={run.artifacts}
          expandedTurnIds={viewState.expandedTurnIds}
          expandedRequestIds={viewState.expandedRequestIds}
          requestSortKey={viewState.requestSortKey}
          requestSortDirection={viewState.requestSortDirection}
          selectedArtifactId={viewState.selectedArtifactId}
          artifactDetail={detail?.data}
          artifactDetailLoading={detailLoading}
          artifactDetailError={detailError}
          onSelectArtifact={(selectedArtifactId) => onChangeViewState({ selectedArtifactId })}
          onChangeRequestSort={(next) => onChangeViewState({
            requestSortKey: next.sortKey ?? viewState.requestSortKey,
            requestSortDirection: next.sortDirection ?? viewState.requestSortDirection
          })}
          onToggleRequest={toggleRequest}
          onToggleTurn={toggleTurn}
        />
      </div>
    </section>
  );
}
