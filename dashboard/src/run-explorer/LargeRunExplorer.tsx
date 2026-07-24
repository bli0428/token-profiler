import { useEffect, useState } from "react";
import type { DashboardApiClient } from "../api/client";
import type { LargeRunArtifactPage, LargeRunResponse } from "../api/types";

export function LargeRunExplorer({ client, runId }: { client: DashboardApiClient; runId: string }) {
  const [run, setRun] = useState<LargeRunResponse>();
  const [error, setError] = useState<string>();
  const [artifacts, setArtifacts] = useState<LargeRunArtifactPage>();
  useEffect(() => { let active = true; setRun(undefined); setArtifacts(undefined); setError(undefined); const load = client.getLargeRun; if (!load) { setError("This dashboard client does not support large runs."); return () => { active = false; }; } load(runId).then((response) => { if (active) setRun(response.data); }, (reason) => { if (active) setError(reason instanceof Error ? reason.message : "Unable to read large run."); }); return () => { active = false; }; }, [client, runId]);
  if (error) return <p>{error}</p>;
  if (!run) return <p>Streaming large run summary…</p>;
  const loadArtifacts = client.getLargeRunArtifacts;
  const loadRequestPage = client.getLargeRunRequests;
  return <section className="run-explorer" aria-label="Large run explorer"><div className="run-main"><h2>Large run (paged)</h2><p>{run.overview.request_count} requests · {run.overview.artifact_count} artifacts · {formatTokens(run.overview.input_tokens)} input tokens · {formatBytes(run.overview.event_file_bytes)} event log</p><table><thead><tr><th>Request</th><th>Input</th><th>Cached</th><th>New</th><th>Artifacts</th><th /></tr></thead><tbody>{run.request_page.items.map((request) => <tr key={request.request_id}><td>{request.request_id}</td><td>{formatTokens(request.usage?.input_tokens)}</td><td>{formatTokens(request.usage?.cached_input_tokens)}</td><td>{formatTokens(request.usage?.uncached_input_tokens)}</td><td>{request.artifact_count}</td><td><button disabled={!loadArtifacts} onClick={() => loadArtifacts?.(runId, request.request_id).then((response) => setArtifacts(response.data))}>Artifacts</button></td></tr>)}</tbody></table>{run.request_page.next_cursor ? <button disabled={!loadRequestPage} onClick={() => loadRequestPage?.(runId, run.request_page.next_cursor).then((response) => setRun((current) => current === undefined ? current : { ...current, request_page: response.data }))}>Next requests</button> : null}{artifacts ? <section><h3>Artifacts for {artifacts.request_id}</h3><ul>{artifacts.items.map((artifact) => <li key={`${artifact.artifact_id}-${artifact.request_order}`}>{artifact.artifact_type}: {artifact.display_name} ({formatTokens(artifact.local_token_count)})</li>)}</ul></section> : null}</div></section>;
}
function formatTokens(value: number | undefined) { return value === undefined ? "—" : value.toLocaleString(); }
function formatBytes(value: number) { return `${(value / (1024 * 1024)).toFixed(1)} MB`; }
