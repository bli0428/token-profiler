import type { DashboardArtifactRow, DashboardRunOverview } from "../api/types";
import { formatTokens } from "./request-format";

type Props = {
  artifacts: DashboardArtifactRow[];
  overview: DashboardRunOverview;
  title?: string;
  timestamp?: string;
};

export function RunOverview({ artifacts, overview, title, timestamp }: Props) {
  const contributorRows = buildContributorRows(artifacts);
  const attributedTotal = contributorRows.reduce((total, row) => total + row.tokens, 0);
  const displayedRows = contributorRows.slice(0, 10);

  return (
    <section className="run-overview">
      <header className="run-overview-header">
        <h2>{title ?? overview.scope_label}</h2>
        {timestamp ? <time className="request-time" dateTime={timestamp}>{formatTimestamp(timestamp)}</time> : null}
      </header>
      <dl className="metric-grid" aria-label="Run token totals">
        <Metric label="Input" value={formatTokens(overview.uncached_input_tokens)} />
        <Metric label="Output" value={formatTokens(overview.output_tokens)} />
        <Metric label="Cached Read" value={formatTokens(overview.cached_input_tokens)} />
        <Metric label="Total Tokens" value={formatTotalTokens(overview)} />
        <Metric label="Requests" value={formatTokens(overview.request_count)} />
      </dl>
      <section className="run-overview-chart" aria-label="Top artifact contributors by normalized token contribution">
        <header className="run-overview-chart-header">
          <div>
            <h3>Top artifact contributors</h3>
            <p>Normalized artifact input contribution across repeated appearances in this session.</p>
          </div>
          <span>{formatTokens(attributedTotal)} attributed</span>
        </header>
        {displayedRows.length > 0 ? (
          <ol className="contributor-bar-list">
            {displayedRows.map((row) => (
              <li key={row.artifact_id} className="contributor-bar-row">
                <div className="contributor-bar-labels">
                  <span className="contributor-bar-name">{row.display_name}</span>
                  <span className="contributor-bar-value">{formatTokens(row.tokens)}</span>
                </div>
                <div className="contributor-bar-track" aria-hidden="true">
                  <div className="contributor-bar-fill" style={{ width: `${row.share * 100}%` }} />
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="run-overview-empty">No normalized artifact contribution is available for this session.</p>
        )}
      </section>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function formatTotalTokens(overview: DashboardRunOverview): string {
  if (overview.input_tokens === undefined || overview.output_tokens === undefined) return "Unavailable";
  return formatTokens(overview.input_tokens + overview.output_tokens);
}

function buildContributorRows(
  artifacts: DashboardArtifactRow[]
): Array<{ artifact_id: string; display_name: string; tokens: number; share: number }> {
  const rows = artifacts
    .map((artifact) => ({
      artifact_id: artifact.artifact_id,
      display_name: artifact.display_name,
      tokens: normalizedArtifactTokens(artifact)
    }))
    .filter((row) => row.tokens > 0)
    .sort((a, b) => b.tokens - a.tokens || a.display_name.localeCompare(b.display_name) || a.artifact_id.localeCompare(b.artifact_id));

  const max = rows[0]?.tokens ?? 0;
  return rows.map((row) => ({
    ...row,
    share: max > 0 ? row.tokens / max : 0
  }));
}

function normalizedArtifactTokens(artifact: DashboardArtifactRow): number {
  if (artifact.normalized_estimated_input_tokens !== undefined) {
    return Number(artifact.normalized_estimated_input_tokens) || 0;
  }
  if (artifact.estimated_cached_input_tokens !== undefined || artifact.estimated_uncached_input_tokens !== undefined) {
    return (Number(artifact.estimated_cached_input_tokens) || 0) + (Number(artifact.estimated_uncached_input_tokens) || 0);
  }
  return 0;
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}
