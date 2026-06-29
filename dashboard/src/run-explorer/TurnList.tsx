import type { DashboardArtifactRow, DashboardTurnGroup } from "../api/types";
import { EmptyState } from "../components/EmptyState";
import type { RequestSortKey } from "../state/view-state";
import { TurnRow } from "./TurnRow";

type Props = {
  turns: DashboardTurnGroup[];
  artifactRows: DashboardArtifactRow[];
  expandedTurnIds: string[];
  expandedRequestIds: string[];
  requestSortKey: RequestSortKey;
  requestSortDirection: "asc" | "desc";
  selectedArtifactId?: string;
  onChangeRequestSort: (next: { sortKey?: RequestSortKey; sortDirection?: "asc" | "desc" }) => void;
  onToggleTurn: (turnId: string) => void;
  onToggleRequest: (requestId: string) => void;
  onSelectArtifact: (artifactId: string) => void;
};

const sortOptions: Array<{ value: RequestSortKey; label: string }> = [
  { value: "time", label: "Time" },
  { value: "input", label: "Input" },
  { value: "output", label: "Output" },
  { value: "cached_read", label: "Cached Read" },
  { value: "total_tokens", label: "Total Tokens" },
  { value: "requests", label: "Requests" }
];

export function TurnList({
  turns,
  artifactRows,
  expandedTurnIds,
  expandedRequestIds,
  requestSortKey,
  requestSortDirection,
  selectedArtifactId,
  onChangeRequestSort,
  onToggleTurn,
  onToggleRequest,
  onSelectArtifact
}: Props) {
  if (turns.length === 0) {
    return <EmptyState title="No turns" message="This run has no turn groups to display." />;
  }
  const activeSortKey = sortOptions.some((option) => option.value === requestSortKey) ? requestSortKey : "requests";
  const sortedTurns = sortTurns(turns, activeSortKey, requestSortDirection);

  return (
    <section className="turn-list" aria-label="Turns">
      <header className="turn-list-header">
        <div>
          <h2>Turns</h2>
          <p>{turns.length} turn{turns.length === 1 ? "" : "s"} · {turns.reduce((total, turn) => total + turn.requests.length, 0)} requests</p>
        </div>
        <div className="request-sort-controls" aria-label="Turn sorting">
          <label>
            Category
            <select
              value={activeSortKey}
              onChange={(event) => onChangeRequestSort({ sortKey: event.target.value as RequestSortKey })}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label>
            Direction
            <select
              value={requestSortDirection}
              onChange={(event) => onChangeRequestSort({ sortDirection: event.target.value as "asc" | "desc" })}
            >
              <option value="asc">Asc</option>
              <option value="desc">Desc</option>
            </select>
          </label>
        </div>
      </header>
      <div className="turn-list-rows">
        {sortedTurns.map((turn, index) => (
          <TurnRow
            artifactRows={artifactRows}
            expanded={expandedTurnIds.includes(turn.turn_id)}
            expandedRequestIds={expandedRequestIds}
            index={index}
            key={turn.turn_id}
            selectedArtifactId={selectedArtifactId}
            turn={turn}
            onSelectArtifact={onSelectArtifact}
            onToggleRequest={onToggleRequest}
            onToggleTurn={onToggleTurn}
          />
        ))}
      </div>
    </section>
  );
}

function sortTurns(
  turns: DashboardTurnGroup[],
  sortKey: RequestSortKey,
  sortDirection: "asc" | "desc"
): DashboardTurnGroup[] {
  return [...turns].sort((left, right) => {
    const compared = compareSortValues(turnSortValue(left, sortKey), turnSortValue(right, sortKey));
    if (compared !== 0) return sortDirection === "asc" ? compared : -compared;
    return firstTurnChronology(left) - firstTurnChronology(right) || left.turn_id.localeCompare(right.turn_id);
  });
}

function turnSortValue(turn: DashboardTurnGroup, sortKey: RequestSortKey): number | undefined {
  if (sortKey === "time") return firstTurnTimeValue(turn);
  if (sortKey === "input") return turn.metrics.uncached_input_tokens;
  if (sortKey === "output") return turn.metrics.output_tokens;
  if (sortKey === "cached_read") return turn.metrics.cached_input_tokens;
  if (sortKey === "total_tokens") return turn.metrics.total_tokens;
  return turn.requests.length;
}

function firstTurnTimeValue(turn: DashboardTurnGroup): number {
  const first = firstTurnRequest(turn);
  if (!first?.timestamp) return first?.chronology_index ?? Number.POSITIVE_INFINITY;
  const timestamp = Date.parse(first.timestamp);
  return Number.isNaN(timestamp) ? first.chronology_index : timestamp;
}

function firstTurnChronology(turn: DashboardTurnGroup): number {
  return firstTurnRequest(turn)?.chronology_index ?? Number.POSITIVE_INFINITY;
}

function firstTurnRequest(turn: DashboardTurnGroup): DashboardTurnGroup["requests"][number] | undefined {
  return [...turn.requests].sort((left, right) => left.chronology_index - right.chronology_index)[0];
}

function compareSortValues(left: number | undefined, right: number | undefined): number {
  if (left === undefined && right === undefined) return 0;
  if (left === undefined) return 1;
  if (right === undefined) return -1;
  return left - right;
}
