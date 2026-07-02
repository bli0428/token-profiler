import type { ArtifactDetailResponse, DashboardRun, DashboardSession } from "../api/types";
import type { DashboardViewState } from "../state/view-state";
import { RunOverview } from "./RunOverview";
import { TurnList } from "./TurnList";

type Props = {
  run: DashboardRun;
  details?: Record<string, ArtifactDetailResponse>;
  loadingArtifactIds?: string[];
  artifactErrors?: Record<string, string | undefined>;
  viewState: DashboardViewState;
  session?: DashboardSession;
  lastUpdatedAt?: string;
  onChangeViewState: (next: Partial<DashboardViewState>) => void;
};

export function RunExplorer({
  run,
  details = {},
  loadingArtifactIds = [],
  artifactErrors = {},
  viewState,
  session,
  lastUpdatedAt,
  onChangeViewState
}: Props) {
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

  const toggleArtifact = (artifactId: string | undefined) => {
    if (!artifactId) return;
    const expanded = new Set(viewState.expandedArtifactIds);
    if (expanded.has(artifactId)) {
      expanded.delete(artifactId);
      onChangeViewState({
        expandedArtifactIds: Array.from(expanded),
        ...(viewState.selectedArtifactId === artifactId ? { selectedArtifactId: undefined } : {})
      });
      return;
    }

    expanded.add(artifactId);
    onChangeViewState({
      expandedArtifactIds: Array.from(expanded),
      selectedArtifactId: artifactId
    });
  };

  const selectContributor = (artifactId: string) => {
    const firstInstance = firstArtifactInstance(run, artifactId);
    if (!firstInstance) {
      onChangeViewState({ selectedArtifactId: artifactId });
      return;
    }

    onChangeViewState({
      expandedTurnIds: union(viewState.expandedTurnIds, [firstInstance.turnId]),
      expandedRequestIds: union(viewState.expandedRequestIds, [firstInstance.requestId]),
      expandedArtifactIds: union(viewState.expandedArtifactIds, [artifactId]),
      selectedArtifactId: artifactId
    });

    window.setTimeout(() => {
      document.getElementById(artifactInstanceDomId(firstInstance.requestId, artifactId, firstInstance.requestOrder))
        ?.scrollIntoView?.({ block: "center", behavior: "smooth" });
    }, 0);
  };

  return (
    <section className="run-explorer" aria-label="Run explorer">
      <div className="run-main">
        <RunOverview
          artifacts={run.artifacts}
          overview={run.overview}
          title={title}
          timestamp={timestamp}
          onSelectContributor={selectContributor}
        />
        <TurnList
          turns={run.turns}
          artifactRows={run.artifacts}
          expandedTurnIds={viewState.expandedTurnIds}
          expandedRequestIds={viewState.expandedRequestIds}
          expandedArtifactIds={viewState.expandedArtifactIds}
          requestSortKey={viewState.requestSortKey}
          requestSortDirection={viewState.requestSortDirection}
          selectedArtifactId={viewState.selectedArtifactId}
          artifactDetails={Object.fromEntries(Object.entries(details).map(([artifactId, response]) => [artifactId, response.data]))}
          loadingArtifactIds={loadingArtifactIds}
          artifactErrors={artifactErrors}
          onToggleArtifact={toggleArtifact}
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

function firstArtifactInstance(run: DashboardRun, artifactId: string): { turnId: string; requestId: string; requestOrder: number } | undefined {
  const instances = run.turns.flatMap((turn) =>
    turn.requests.flatMap((request) =>
      request.artifact_inclusions
        .filter((artifact) => artifact.artifact_id === artifactId)
        .map((artifact) => ({
          turnId: turn.turn_id,
          requestId: request.request_id,
          requestChronology: request.chronology_index,
          requestOrder: artifact.request_order
        }))
    )
  );

  return instances.sort((left, right) =>
    left.requestChronology - right.requestChronology
    || left.requestOrder - right.requestOrder
    || left.requestId.localeCompare(right.requestId)
  )[0];
}

function union(current: string[], additions: string[]): string[] {
  return Array.from(new Set([...current, ...additions]));
}

function artifactInstanceDomId(requestId: string, artifactId: string, requestOrder: number): string {
  return `artifact-${safeDomId(requestId)}-${safeDomId(artifactId)}-${requestOrder}`;
}

function safeDomId(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]+/g, "_");
}
