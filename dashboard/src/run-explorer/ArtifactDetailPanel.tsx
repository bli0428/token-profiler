import type { DashboardArtifactDetail } from "../api/types";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";

type Props = {
  detail?: DashboardArtifactDetail;
  loading: boolean;
  errorMessage?: string;
  inline?: boolean;
};

export function ArtifactDetailPanel({ detail, loading, errorMessage, inline = false }: Props) {
  if (loading) return <EmptyState title="Loading artifact" message="Fetching detail from the dashboard API." />;
  if (errorMessage) return <ErrorState title="Artifact unavailable" message={errorMessage} />;
  if (!detail) return <EmptyState title="No artifact selected" message="Select an artifact row to inspect metadata and metrics." />;

  const content = availableContent(detail);
  return (
    <section className={`detail-panel ${inline ? "detail-panel-inline" : ""}`} aria-label="Artifact detail">
      {detail.metadata_sections.filter((section) => section.title !== "Identity").map((section) => (
        <Section key={section.title} title={section.title} rows={section.rows} />
      ))}
      <Section title="Relationships" rows={relationshipRows(detail)} />
      {content.text ? <pre className="preview">{content.text}</pre> : null}
    </section>
  );
}

function availableContent(detail: DashboardArtifactDetail): { kind: "metadata" | "preview" | "raw"; text?: string } {
  if (detail.content?.raw) return { kind: "raw", text: detail.content.raw };
  if (detail.content?.preview) return { kind: "preview", text: detail.content.preview };
  return { kind: "metadata" };
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

function relationshipRows(detail: DashboardArtifactDetail): Array<{ label: string; value: string }> {
  return [
    ...(detail.tool_links.length > 0 ? [{ label: "Tool links", value: String(detail.tool_links.length) }] : [])
  ];
}
