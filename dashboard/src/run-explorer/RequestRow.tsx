import type { DashboardArtifactRow, DashboardRequestAccountingRow } from "../api/types";
import {
  formatTimestamp,
  requestMetricEntries
} from "./request-format";
import { RequestArtifacts } from "./RequestArtifacts";

type Props = {
  request: DashboardRequestAccountingRow;
  artifactRows: DashboardArtifactRow[];
  expanded: boolean;
  selectedArtifactId?: string;
  onToggleExpanded: (requestId: string) => void;
  onSelectArtifact: (artifactId: string) => void;
};

export function RequestRow({ request, artifactRows, expanded, selectedArtifactId, onToggleExpanded, onSelectArtifact }: Props) {
  const panelId = `request-${request.request_id}-artifacts`;
  const hasArtifacts = request.artifact_inclusions.length > 0;
  const toggle = () => onToggleExpanded(request.request_id);
  return (
    <article
      className={`request-row availability-${request.availability.status}`}
      aria-label={`Request ${request.chronology_index + 1}`}
      tabIndex={0}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("button, a, input, select, textarea")) return;
        toggle();
      }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        toggle();
      }}
    >
      <header className="request-row-header">
        <div>
          <h3>{request.request_id}</h3>
        </div>
        <time className="request-time" dateTime={request.timestamp}>{formatTimestamp(request.timestamp, request.chronology_index)}</time>
      </header>
      <dl className="request-metrics" aria-label="Request token totals">
        {requestMetricEntries(request.usage, request.artifact_count).map((entry) => (
          <div className="request-metric" key={entry.label}>
            <dt>{entry.label}</dt>
            <dd>{entry.value}</dd>
          </div>
        ))}
      </dl>
      {request.availability.limitations.length > 0 || request.availability.missing_facts.length > 0 ? (
        <p className="request-limitations">
          {[...request.availability.limitations, ...request.availability.missing_facts.map((fact) => `Missing ${fact}`)].join(" ")}
        </p>
      ) : null}
      <div className="request-actions">
        <button
          aria-controls={panelId}
          aria-expanded={expanded}
          className="request-expand-button"
          type="button"
          onClick={toggle}
        >
          <span aria-hidden="true">{expanded ? "v" : ">"}</span>
          {expanded ? "Collapse artifacts" : "Expand artifacts"}
        </button>
      </div>
      <div id={panelId} hidden={!expanded}>
        {expanded ? (
          hasArtifacts ? (
            <RequestArtifacts
              artifacts={request.artifact_inclusions}
              artifactRows={artifactRows}
              selectedArtifactId={selectedArtifactId}
              onSelectArtifact={onSelectArtifact}
            />
          ) : (
            <p className="request-empty-note">No request-scoped artifacts are available for this request.</p>
          )
        ) : null}
      </div>
    </article>
  );
}
