import type { DashboardArtifactDetail } from "../api/types";
import { CaveatList } from "../components/CaveatList";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { getPrivacyDisplay } from "../policy/privacy-display";

type Props = {
  detail?: DashboardArtifactDetail;
  loading: boolean;
  errorMessage?: string;
};

export function ArtifactDetailPanel({ detail, loading, errorMessage }: Props) {
  if (loading) return <EmptyState title="Loading artifact" message="Fetching detail from the dashboard API." />;
  if (errorMessage) return <ErrorState title="Artifact unavailable" message={errorMessage} />;
  if (!detail) return <EmptyState title="No artifact selected" message="Select an artifact row to inspect metadata and metrics." />;

  const privacy = detail.privacy.raw_content_available && detail.privacy.raw_content_revealed
    ? getPrivacyDisplay("raw_available")
    : detail.content?.preview
      ? getPrivacyDisplay("preview")
      : getPrivacyDisplay(detail.privacy.unavailable_fields.length > 0 ? "unavailable" : "hidden");
  const rawContent = privacy.canShowRawContent ? detail.content?.raw : undefined;
  return (
    <aside className="detail-panel" aria-label="Artifact detail">
      <header>
        <h2>{detail.title}</h2>
        <span className={`privacy privacy-${privacy.tone}`}>{privacy.label}</span>
      </header>
      <p>{privacy.description}</p>
      <dl className="metric-grid compact">
        <Metric label="Total exposure" value={asNumber(detail.metrics.total_exposure)} />
        <Metric label="Repeated exposure" value={asNumber(detail.metrics.repeated_exposure)} />
        <Metric label="Inclusions" value={asNumber(detail.metrics.inclusion_count)} />
      </dl>
      <Section title="Identity" rows={identityRows(detail)} />
      {detail.metadata_sections.map((section) => (
        <Section key={section.title} title={section.title} rows={section.rows} />
      ))}
      <Section title="Relationships" rows={relationshipRows(detail)} />
      {detail.content?.preview && !rawContent ? <pre className="preview">{detail.content.preview}</pre> : null}
      {rawContent ? <pre className="preview">{rawContent}</pre> : null}
      <CaveatList caveats={detail.caveats} />
    </aside>
  );
}

function Section({ title, rows }: { title: string; rows: Array<{ label: string; value: string }> }) {
  if (rows.length === 0) return null;
  return (
    <section className="detail-section">
      <h3>{title}</h3>
      <dl>
        {rows.map((row) => (
          <div key={`${row.label}-${row.value}`}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
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

function asNumber(value: number | string | boolean | undefined): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function identityRows(detail: DashboardArtifactDetail): Array<{ label: string; value: string }> {
  return [
    { label: "Artifact ID", value: detail.artifact_id },
    { label: "Short ID", value: detail.identity.stable_short_id },
    { label: "Category", value: detail.identity.display_category },
    ...(detail.identity.artifact_name ? [{ label: "Name", value: detail.identity.artifact_name }] : [])
  ];
}

function relationshipRows(detail: DashboardArtifactDetail): Array<{ label: string; value: string }> {
  return [
    ...(detail.task_group_ids.length > 0 ? [{ label: "Task groups", value: detail.task_group_ids.join(", ") }] : []),
    ...(detail.tool_links.length > 0 ? [{ label: "Tool links", value: String(detail.tool_links.length) }] : [])
  ];
}
