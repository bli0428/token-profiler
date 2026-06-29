import { useMemo, useCallback } from "react";
import { createDashboardApiClient } from "../api/client";
import { isDashboardClientError } from "../api/errors";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { useApiStatus } from "../hooks/useApiStatus";
import { useArtifactDetail } from "../hooks/useArtifactDetail";
import { useRefresh } from "../hooks/useRefresh";
import { useSelectedRun } from "../hooks/useSelectedRun";
import { useSessions } from "../hooks/useSessions";
import { useUrlState } from "../hooks/useUrlState";
import { RunExplorer } from "../run-explorer/RunExplorer";
import { SessionList } from "../sessions/SessionList";
import { reconcileRun, reconcileSessions, type RefreshResult } from "../state/reconcile";
import { withSelectedRun } from "../state/view-state";

export function DashboardController() {
  const client = useMemo(() => createDashboardApiClient(), []);
  const [viewState, setViewState] = useUrlState();
  const status = useApiStatus(client);
  const ready = Boolean(status.data?.data.ready);
  const sessions = useSessions(client, ready);
  const selectedRun = useSelectedRun(client, viewState.selectedRunId);
  const artifactDetail = useArtifactDetail(client, viewState.selectedRunId, viewState.selectedArtifactId);

  const refresh = useCallback(async (): Promise<RefreshResult> => {
    try {
      await status.reload();
      await sessions.reload();
      await selectedRun.reload();
      await artifactDetail.reload();
      setViewState((current) => reconcileRun(reconcileSessions(current, sessions.data?.data.sessions ?? []), selectedRun.data?.data));
      return selectedRun.data?.data.overview.availability.status === "partial" ? "partial" : "success";
    } catch {
      return "offline";
    }
  }, [artifactDetail, selectedRun, sessions, setViewState, status]);

  const refreshState = useRefresh(refresh, viewState.refreshMode);
  const storageMode = selectedRun.data?.data.privacy.storage_mode;

  let content;
  if (status.loading) {
    content = <EmptyState title="Checking dashboard API" message={`Connecting to ${client.baseUrl}.`} />;
  } else if (status.error) {
    const title = status.error.kind === "version-mismatch" ? "Dashboard API version mismatch" : "Dashboard API offline";
    content = <ErrorState title={title} message={status.error.message} onAction={status.reload} />;
  } else if (!status.data?.data.ready) {
    content = <ErrorState title="Dashboard API not ready" message="The local API is not ready yet." onAction={status.reload} />;
  } else if (sessions.error) {
    content = <ErrorState title="Unable to load sessions" message={sessions.error.message} onAction={sessions.reload} />;
  } else {
    const sessionList = sessions.data?.data.sessions ?? [];
    const selectedSession = sessionList.find((session) => session.run_id === viewState.selectedRunId);

    content = (
      <>
        <div className="shell-toolbar">
          <div>
            <strong>API ready</strong>
            <span>{client.baseUrl}</span>
          </div>
          <button type="button" onClick={() => void refreshState.refreshNow()} disabled={refreshState.refreshing}>
            {refreshState.refreshing ? "Refreshing" : "Refresh"}
          </button>
          <label className="toggle">
            <input
              type="checkbox"
              checked={viewState.refreshMode === "interval"}
              onChange={(event) => setViewState((current) => ({ ...current, refreshMode: event.target.checked ? "interval" : "manual" }))}
            />
            Auto refresh
          </label>
        </div>
        <div className="dashboard-grid">
          {sessions.loading ? (
            <EmptyState title="Loading sessions" message="Fetching recent dashboard sessions." />
          ) : sessionList.length === 0 ? (
            <EmptyState title="No sessions" message="The dashboard API returned no recent sessions." />
          ) : (
            <SessionList
              sessions={sessionList}
              selectedRunId={viewState.selectedRunId}
              onSelect={(selectedRunId) => setViewState((current) => withSelectedRun(current, selectedRunId))}
            />
          )}
          <main className="content-pane">
            {!viewState.selectedRunId ? <EmptyState title="Select a session" message="Choose a recent run to inspect context artifacts." /> : null}
            {selectedRun.loading ? <EmptyState title="Loading run" message="Fetching run overview and artifact rows." /> : null}
            {selectedRun.error ? <ErrorState title={selectedRun.error.kind === "not-found" ? "Run not found" : "Unable to load run"} message={selectedRun.error.message} /> : null}
            {selectedRun.data ? (
              <RunExplorer
                run={selectedRun.data.data}
                detail={artifactDetail.data}
                detailLoading={artifactDetail.loading}
                detailError={isDashboardClientError(artifactDetail.error) ? artifactDetail.error.message : undefined}
                viewState={viewState}
                session={selectedSession}
                lastUpdatedAt={refreshState.lastUpdatedAt ?? selectedRun.data.generated_at}
                onChangeViewState={(next) => setViewState((current) => ({ ...current, ...next }))}
              />
            ) : null}
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <header className="app-header">
        <div>
          <h1>Token Profiler Dashboard</h1>
          <p>Local context exposure explorer</p>
          <p className="app-header-note">*Artifact-level attribution is estimated from local tokenization.</p>
        </div>
        <div className="storage-mode-pill" aria-label="Storage mode">
          <span>Storage mode:</span>
          <strong>{formatStorageMode(storageMode)}</strong>
        </div>
      </header>
      {content}
    </>
  );
}

function formatStorageMode(value: string | undefined): string {
  if (!value) return "Unavailable";
  if (value === "raw") return "Raw";
  return value.charAt(0).toUpperCase() + value.slice(1);
}
