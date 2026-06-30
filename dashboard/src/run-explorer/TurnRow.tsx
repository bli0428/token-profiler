import type { DashboardArtifactDetail, DashboardArtifactRow, DashboardTurnGroup } from "../api/types";
import { formatPreviewTitle, formatTimestamp, turnMetricEntries } from "./request-format";
import { RequestRow } from "./RequestRow";

type Props = {
  turn: DashboardTurnGroup;
  index: number;
  artifactRows: DashboardArtifactRow[];
  expanded: boolean;
  expandedRequestIds: string[];
  selectedArtifactId?: string;
  artifactDetail?: DashboardArtifactDetail;
  artifactDetailLoading?: boolean;
  artifactDetailError?: string;
  onToggleTurn: (turnId: string) => void;
  onToggleRequest: (requestId: string) => void;
  onSelectArtifact: (artifactId: string | undefined) => void;
};

export function TurnRow({
  turn,
  index,
  artifactRows,
  expanded,
  expandedRequestIds,
  selectedArtifactId,
  artifactDetail,
  artifactDetailLoading = false,
  artifactDetailError,
  onToggleTurn,
  onToggleRequest,
  onSelectArtifact
}: Props) {
  const panelId = `turn-${safeDomId(turn.turn_id)}-requests`;
  const toggle = () => onToggleTurn(turn.turn_id);
  const fallback = turn.grouping_source !== "direct_turn_id" || turn.confidence === "fallback";
  const firstRequest = [...turn.requests].sort((left, right) => left.chronology_index - right.chronology_index)[0];

  return (
    <article
      aria-label={`Turn ${index + 1}`}
      className={`turn-row confidence-${turn.confidence} ${fallback ? "is-fallback" : ""}`}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("button, a, input, select, textarea, article.request-row")) return;
        toggle();
      }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        toggle();
      }}
      tabIndex={0}
    >
      <header className="turn-row-header">
        <div>
          <h3 title={turn.display_title}>{formatPreviewTitle(turn.display_title)}</h3>
          {fallback ? <p className="turn-fallback-label">{fallbackLabel(turn.grouping_source)}</p> : null}
        </div>
        <time className="request-time turn-time" dateTime={firstRequest?.timestamp}>
          {formatTimestamp(firstRequest?.timestamp, firstRequest?.chronology_index ?? index)}
        </time>
        <dl className="turn-metrics" aria-label="Turn token totals">
          {turnMetricEntries(turn.metrics, turn.requests.length).map((entry) => (
            <Metric key={entry.label} label={entry.label} value={entry.value} />
          ))}
        </dl>
      </header>
      <div className="turn-actions">
        <button
          aria-controls={panelId}
          aria-expanded={expanded}
          className="request-expand-button"
          type="button"
          onClick={toggle}
        >
          <span aria-hidden="true">{expanded ? "v" : ">"}</span>
          {expanded ? "Collapse requests" : "Expand requests"}
        </button>
      </div>
      <div className="turn-request-panel" id={panelId} hidden={!expanded}>
        {expanded ? (
          turn.requests.length > 0 ? (
            <div className="turn-request-rows">
              {turn.requests.map((request) => (
                <RequestRow
                  artifactRows={artifactRows}
                  expanded={expandedRequestIds.includes(request.request_id)}
                  key={request.request_id}
                  request={request}
                  selectedArtifactId={selectedArtifactId}
                  artifactDetail={artifactDetail}
                  artifactDetailLoading={artifactDetailLoading}
                  artifactDetailError={artifactDetailError}
                  onSelectArtifact={onSelectArtifact}
                  onToggleExpanded={onToggleRequest}
                />
              ))}
            </div>
          ) : (
            <p className="request-empty-note">No requests are available for this turn.</p>
          )
        ) : null}
      </div>
    </article>
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

function fallbackLabel(source: DashboardTurnGroup["grouping_source"]): string {
  if (source === "missing_turn_id") return "Missing turn identity";
  return "Fallback grouping";
}

function safeDomId(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]+/g, "_");
}
