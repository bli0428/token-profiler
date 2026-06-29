import type { DashboardArtifactDetail, DashboardArtifactRow, DashboardRequestAccountingRow, DashboardRequestArtifactInclusion } from "../api/types";
import {
  formatTimestamp,
  requestMetricEntries
} from "./request-format";
import { RequestArtifacts } from "./RequestArtifacts";

type Props = {
  request: DashboardRequestAccountingRow;
  artifactRows: DashboardArtifactRow[];
  artifactDetails: Record<string, DashboardArtifactDetail>;
  expanded: boolean;
  selectedArtifactId?: string;
  onToggleExpanded: (requestId: string) => void;
  onSelectArtifact: (artifactId: string) => void;
};

export function RequestRow({ request, artifactRows, artifactDetails, expanded, selectedArtifactId, onToggleExpanded, onSelectArtifact }: Props) {
  const panelId = `request-${request.request_id}-artifacts`;
  const hasArtifacts = request.artifact_inclusions.length > 0;
  const requestTitle = titleForRequest(request, artifactDetails);
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
          <h3>{requestTitle}</h3>
          {requestTitle !== request.request_id ? <p className="request-id-fallback">{request.request_id}</p> : null}
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

function titleForRequest(
  request: DashboardRequestAccountingRow,
  artifactDetails: Record<string, DashboardArtifactDetail>
): string {
  const inclusions = [...request.artifact_inclusions].sort((left, right) => left.request_order - right.request_order);

  for (const inclusion of [...inclusions].reverse().filter((candidate) => isUserMessage(candidate, artifactDetails[candidate.artifact_id]))) {
    const detail = artifactDetails[inclusion.artifact_id];
    const title = firstUsefulTitle([
      detail?.content?.preview,
      detail?.content?.raw
    ]);
    if (title) return title;
  }

  return request.request_id;
}

function isUserMessage(inclusion: DashboardRequestArtifactInclusion, detail: DashboardArtifactDetail | undefined): boolean {
  return inclusion.display_category === "user_message" || detail?.identity.display_category === "user_message";
}

function firstUsefulTitle(candidates: Array<string | undefined>): string | undefined {
  for (const candidate of candidates) {
    const normalized = normalizeTitle(candidate);
    if (normalized && !isGenericRequestTitle(normalized)) return normalized;
  }
  return undefined;
}

function normalizeTitle(value: string | undefined): string | undefined {
  const normalized = value?.replace(/\s+/g, " ").trim();
  if (!normalized) return undefined;
  return normalized.length > 140 ? `${normalized.slice(0, 137)}...` : normalized;
}

function isGenericRequestTitle(value: string): boolean {
  if (/^(user|assistant) message$/i.test(value)) return true;
  if (/^instructions$/i.test(value)) return true;
  if (/^message:[a-z]+:\d+(?::\d+)*$/i.test(value)) return true;
  if (/^readable metadata unavailable\.?$/i.test(value)) return true;
  if (/^[A-Z_]+:[A-Za-z0-9:_-]+$/.test(value)) return true;
  return false;
}
