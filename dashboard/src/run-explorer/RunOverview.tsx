import type { DashboardRunOverview } from "../api/types";

type Props = {
  overview: DashboardRunOverview;
  lastUpdatedAt?: string;
};

export function RunOverview({ overview, lastUpdatedAt }: Props) {
  return (
    <section className="run-overview">
      <div>
        <h2>{overview.scope_label}</h2>
        <p>{overview.scope}</p>
      </div>
      <dl className="metric-grid">
        <Metric label="Total exposure" value={overview.total_exposure} />
        <Metric label="Repeated exposure" value={overview.repeated_exposure} />
        <Metric label="Requests" value={overview.request_count} />
        <Metric label="Cached input" value={overview.cached_input_tokens} />
      </dl>
      <div className="status-row">
        <span className={`availability availability-${overview.availability.status}`}>{overview.availability.status}</span>
        {lastUpdatedAt ? <span>Last refreshed {new Date(lastUpdatedAt).toLocaleTimeString()}</span> : null}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value?: number }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value ?? "Unavailable"}</dd>
    </div>
  );
}
