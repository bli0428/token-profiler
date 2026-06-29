import type { DashboardArtifactRow, DashboardTurnGroup } from "../api/types";
import { formatTokens } from "./request-format";
import { RequestRow } from "./RequestRow";

type Props = {
  turn: DashboardTurnGroup;
  index: number;
  artifactRows: DashboardArtifactRow[];
  expanded: boolean;
  expandedRequestIds: string[];
  selectedArtifactId?: string;
  onToggleTurn: (turnId: string) => void;
  onToggleRequest: (requestId: string) => void;
  onSelectArtifact: (artifactId: string) => void;
};

export function TurnRow({
  turn,
  index,
  artifactRows,
  expanded,
  expandedRequestIds,
  selectedArtifactId,
  onToggleTurn,
  onToggleRequest,
  onSelectArtifact
}: Props) {
  const panelId = `turn-${safeDomId(turn.turn_id)}-requests`;
  const toggle = () => onToggleTurn(turn.turn_id);
  const fallback = turn.grouping_source !== "direct_turn_id" || turn.confidence === "fallback";

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
          <h3>{turn.display_title}</h3>
          <p className="turn-meta">
            {titleSourceLabel(turn.title_source)} · {turn.requests.length} request{turn.requests.length === 1 ? "" : "s"} · {turn.artifact_ids.length} artifacts
          </p>
          {fallback ? <p className="turn-fallback-label">{fallbackLabel(turn.grouping_source)}</p> : null}
        </div>
        <dl className="turn-metrics" aria-label="Turn token totals">
          <Metric label="Input" value={formatTokens(turn.metrics.uncached_input_tokens)} />
          <Metric label="Output" value={formatTokens(turn.metrics.output_tokens)} />
          <Metric label="Cached Read" value={formatTokens(turn.metrics.cached_input_tokens)} />
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

function titleSourceLabel(source: DashboardTurnGroup["title_source"]): string {
  if (source === "user_preview") return "User preview";
  if (source === "safe_summary") return "Safe summary";
  if (source === "turn_id") return "Turn ID";
  return "Fallback";
}

function fallbackLabel(source: DashboardTurnGroup["grouping_source"]): string {
  if (source === "missing_turn_id") return "Missing turn identity";
  return "Fallback grouping";
}

function safeDomId(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]+/g, "_");
}
