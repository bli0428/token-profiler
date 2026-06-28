import type { DashboardRunOverview } from "../api/types";
import { formatTokens } from "./request-format";

type Props = {
  overview: DashboardRunOverview;
  title?: string;
  timestamp?: string;
};

export function RunOverview({ overview, title, timestamp }: Props) {
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

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}
