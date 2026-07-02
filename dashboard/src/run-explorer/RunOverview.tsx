import type { DashboardArtifactRow, DashboardRunOverview } from "../api/types";
import { formatTokens } from "./request-format";

const TOP_CONTRIBUTOR_LIMIT = 5;

type Props = {
  artifacts: DashboardArtifactRow[];
  overview: DashboardRunOverview;
  title?: string;
  timestamp?: string;
  onSelectContributor?: (artifactId: string) => void;
};

export function RunOverview({ artifacts, overview, title, timestamp, onSelectContributor }: Props) {
  const contributorRows = buildContributorRows(artifacts);
  const displayedRows = contributorRows.slice(0, TOP_CONTRIBUTOR_LIMIT);
  const uniqueRows = buildUniqueRows(artifacts);
  const displayedUniqueRows = uniqueRows.slice(0, TOP_CONTRIBUTOR_LIMIT);

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
            <h3>Top 5 Artifact Contributors</h3>
            <p>High artifact contribution might indicate context pollution.</p>
          </div>
        </header>
        {displayedRows.length > 0 ? (
          <>
            <ContributorRows
              rows={displayedRows}
              valueLabel={formatContributorValue}
              onSelectContributor={onSelectContributor}
            />
            <p className="run-overview-chart-note">
              *Repeat artifacts are often cached, so a high artifact contribution does not necessarily mean it is your main cost driver
            </p>
          </>
        ) : (
          <p className="run-overview-empty">No normalized artifact contribution is available for this session.</p>
        )}
      </section>
      <section className="run-overview-chart" aria-label="Top first occurrence artifacts by token contribution">
        <header className="run-overview-chart-header">
          <div>
            <h3>Top 5 First Occurrence Artifacts</h3>
            <p>Largest local token counts the first time each artifact appeared in this session.</p>
          </div>
        </header>
        {displayedUniqueRows.length > 0 ? (
          <ContributorRows
            rows={displayedUniqueRows}
            valueLabel={formatUniqueValue}
            onSelectContributor={onSelectContributor}
          />
        ) : (
          <p className="run-overview-empty">No first occurrence artifact contribution is available for this session.</p>
        )}
      </section>
    </section>
  );
}

function ContributorRows({
  rows,
  valueLabel,
  onSelectContributor
}: {
  rows: ContributorRow[];
  valueLabel: (row: ContributorRow) => string;
  onSelectContributor?: (artifactId: string) => void;
}) {
  return (
    <ol className="contributor-bar-list">
      {rows.map((row) => (
        <li key={row.artifact_id} className="contributor-bar-row">
          <div className="contributor-bar-labels">
            <button
              className="contributor-bar-name"
              type="button"
              onClick={() => onSelectContributor?.(row.artifact_id)}
            >
              {row.display_name}
            </button>
            <span className="contributor-bar-value">{valueLabel(row)}</span>
          </div>
          <div className="contributor-bar-track" aria-hidden="true">
            <div className="contributor-bar-fill" style={{ width: `${row.share * 100}%` }} />
          </div>
        </li>
      ))}
    </ol>
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

type ContributorRow = {
  artifact_id: string;
  display_name: string;
  inclusion_count: number;
  tokens: number;
  share: number;
};

function buildContributorRows(artifacts: DashboardArtifactRow[]): ContributorRow[] {
  const rows = artifacts
    .map((artifact) => ({
      artifact_id: artifact.artifact_id,
      display_name: artifact.display_name,
      inclusion_count: artifact.inclusion_count,
      tokens: normalizedArtifactTokens(artifact)
    }))
    .filter((row) => row.tokens > 0)
    .sort((a, b) => b.tokens - a.tokens || a.display_name.localeCompare(b.display_name) || a.artifact_id.localeCompare(b.artifact_id));

  const total = rows.reduce((sum, row) => sum + row.tokens, 0);
  return rows.map((row) => ({
    ...row,
    share: total > 0 ? row.tokens / total : 0
  }));
}

function buildUniqueRows(artifacts: DashboardArtifactRow[]): ContributorRow[] {
  const rows = artifacts
    .map((artifact) => ({
      artifact_id: artifact.artifact_id,
      display_name: artifact.display_name,
      inclusion_count: artifact.inclusion_count,
      tokens: Number(artifact.unique_exposure) || 0
    }))
    .filter((row) => row.tokens > 0)
    .sort((a, b) => b.tokens - a.tokens || a.display_name.localeCompare(b.display_name) || a.artifact_id.localeCompare(b.artifact_id));

  const total = rows.reduce((sum, row) => sum + row.tokens, 0);
  return rows.map((row) => ({
    ...row,
    share: total > 0 ? row.tokens / total : 0
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

function formatContributorValue(row: ContributorRow): string {
  const occurrenceLabel = row.inclusion_count === 1 ? "occurrence" : "occurrences";
  return `${formatTokens(row.inclusion_count)} ${occurrenceLabel} · ${formatTokens(row.tokens)} Tokens`;
}

function formatUniqueValue(row: ContributorRow): string {
  return `${formatTokens(row.tokens)} Tokens`;
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}
