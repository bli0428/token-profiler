import type { DashboardArtifactRow, DashboardRequestAccountingRow } from "../api/types";
import { CaveatList } from "../components/CaveatList";
import {
  formatEstimatedTokens,
  formatPercent,
  formatTimestamp,
  requestAvailabilityLabel,
  usageMetricEntries
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
  return (
    <article className={`request-row availability-${request.availability.status}`} aria-label={`Request ${request.chronology_index + 1}`}>
      <header className="request-row-header">
        <div>
          <h3>{formatTimestamp(request.timestamp, request.chronology_index)}</h3>
          <p>
            {request.request_id} · {requestAvailabilityLabel(request.availability)}
          </p>
        </div>
        <button
          aria-controls={panelId}
          aria-expanded={expanded}
          className="request-expand-button"
          type="button"
          onClick={() => onToggleExpanded(request.request_id)}
        >
          {expanded ? "Collapse artifacts" : "Expand artifacts"}
        </button>
      </header>
      <dl className="request-metrics" aria-label="Provider request token totals">
        {usageMetricEntries(request.usage).map((entry) => (
          <div className="request-metric request-metric-provider" key={entry.label}>
            <dt>{entry.label}</dt>
            <dd>{entry.value}</dd>
          </div>
        ))}
      </dl>
      <dl className="request-estimates" aria-label="Local artifact token estimates">
        <div>
          <dt>Artifacts</dt>
          <dd>{request.artifact_count}</dd>
        </div>
        <div>
          <dt>Local artifact estimate</dt>
          <dd>{formatEstimatedTokens(request.total_local_artifact_tokens)}</dd>
        </div>
        <div>
          <dt>Cache coverage</dt>
          <dd>{formatPercent(request.cache_attribution?.attribution_coverage)}</dd>
        </div>
      </dl>
      {request.availability.limitations.length > 0 || request.availability.missing_facts.length > 0 ? (
        <p className="request-limitations">
          {[...request.availability.limitations, ...request.availability.missing_facts.map((fact) => `Missing ${fact}`)].join(" ")}
        </p>
      ) : null}
      <CaveatList caveats={request.caveats} />
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
