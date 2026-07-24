import { useCallback, useEffect, useState } from "react";
import type { DashboardApiClient } from "../api/client";
import type { LargeRunArtifactPage, LargeRunRequest, LargeRunResponse } from "../api/types";

export function LargeRunExplorer({ client, runId }: { client: DashboardApiClient; runId: string }) {
  const [run, setRun] = useState<LargeRunResponse>();
  const [error, setError] = useState<string>();
  const [artifacts, setArtifacts] = useState<LargeRunArtifactPage>();

  useEffect(() => {
    let active = true;
    const load = client.getLargeRun;
    setRun(undefined);
    setArtifacts(undefined);
    setError(undefined);

    if (!load) {
      setError("This dashboard client does not support large runs.");
      return () => { active = false; };
    }

    void load(runId).then(
      (response) => { if (active) setRun(response.data); },
      (reason) => { if (active) setError(messageFor(reason, "Unable to read large run.")); }
    );
    return () => { active = false; };
  }, [client, runId]);

  const loadRequestPage = useCallback(async () => {
    if (!run?.request_page.next_cursor || !client.getLargeRunRequests) return;
    try {
      const response = await client.getLargeRunRequests(runId, run.request_page.next_cursor);
      setRun((current) => current === undefined ? current : { ...current, request_page: response.data });
    } catch (reason) {
      setError(messageFor(reason, "Unable to load more requests."));
    }
  }, [client, run, runId]);

  const loadArtifacts = useCallback(async (request: LargeRunRequest, cursor?: string) => {
    if (!client.getLargeRunArtifacts) return;
    try {
      const response = await client.getLargeRunArtifacts(runId, request.request_id, cursor);
      setArtifacts(response.data);
      setError(undefined);
    } catch (reason) {
      setError(messageFor(reason, "Unable to load artifacts."));
    }
  }, [client, runId]);

  if (error) return <p className="large-run-error" role="alert">{error}</p>;
  if (!run) return <p className="large-run-loading">Streaming large run summary…</p>;

  const canLoadArtifacts = Boolean(client.getLargeRunArtifacts);
  const selectedRequest = run.request_page.items.find((request) => request.request_id === artifacts?.request_id);

  return (
    <section className="run-explorer large-run-explorer" aria-label="Large run explorer">
      <div className="run-main">
        <header className="large-run-header">
          <div>
            <h2>Large run (paged)</h2>
            <p>{run.overview.request_count} requests · {run.overview.artifact_count} artifacts · {formatTokens(run.overview.input_tokens)} input tokens · {formatBytes(run.overview.event_file_bytes)} event log</p>
          </div>
          <p className="large-run-note">Requests and artifacts load one page at a time.</p>
        </header>

        <div className="table-wrap">
          <table className="large-run-table">
            <thead><tr><th>Request</th><th>Input</th><th>Cached</th><th>New</th><th>Artifacts</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{run.request_page.items.map((request) => (
              <tr key={request.request_id}>
                <td>{request.request_id}</td><td>{formatTokens(request.usage?.input_tokens)}</td><td>{formatTokens(request.usage?.cached_input_tokens)}</td><td>{formatTokens(request.usage?.uncached_input_tokens)}</td><td>{request.artifact_count}</td>
                <td><button type="button" disabled={!canLoadArtifacts} onClick={() => void loadArtifacts(request)}>Artifacts for {request.request_id}</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>

        {run.request_page.next_cursor ? <button className="large-run-next" type="button" disabled={!client.getLargeRunRequests} onClick={() => void loadRequestPage()}>Next requests</button> : null}

        {artifacts ? (
          <section className="large-run-artifacts" aria-label={`Artifacts for ${artifacts.request_id}`}>
            <h3>Artifacts for {artifacts.request_id}</h3>
            <ul>{artifacts.items.map((artifact) => <li key={`${artifact.artifact_id}-${artifact.request_order}`}>{artifact.artifact_type}: {artifact.display_name} ({formatTokens(artifact.local_token_count)}) · {artifact.preview_state}</li>)}</ul>
            {artifacts.next_cursor && selectedRequest ? <button className="large-run-next" type="button" disabled={!canLoadArtifacts} onClick={() => void loadArtifacts(selectedRequest, artifacts.next_cursor)}>Next artifacts</button> : null}
          </section>
        ) : null}
      </div>
    </section>
  );
}

function formatTokens(value: number | undefined): string { return value === undefined ? "—" : value.toLocaleString(); }
function formatBytes(value: number): string { return `${(value / (1024 * 1024)).toFixed(1)} MB`; }
function messageFor(reason: unknown, fallback: string): string { return reason instanceof Error ? reason.message : fallback; }
