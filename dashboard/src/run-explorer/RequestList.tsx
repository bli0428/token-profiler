import type { DashboardArtifactRow, DashboardRequestAccounting, DashboardRequestAccountingRow } from "../api/types";
import { EmptyState } from "../components/EmptyState";
import type { RequestSortKey } from "../state/view-state";
import { collectionAvailabilityLabel } from "./request-format";
import { RequestRow } from "./RequestRow";

type Props = {
  requests?: DashboardRequestAccounting;
  artifactRows: DashboardArtifactRow[];
  expandedRequestIds: string[];
  selectedArtifactId?: string;
  sortKey: RequestSortKey;
  sortDirection: "asc" | "desc";
  onChangeSort: (next: { sortKey?: RequestSortKey; sortDirection?: "asc" | "desc" }) => void;
  onToggleExpanded: (requestId: string) => void;
  onSelectArtifact: (artifactId: string) => void;
};

const sortOptions: Array<{ value: RequestSortKey; label: string }> = [
  { value: "time", label: "Time" },
  { value: "input", label: "Input" },
  { value: "output", label: "Output" },
  { value: "cached_read", label: "Cached Read" },
  { value: "total_tokens", label: "Total Tokens" },
  { value: "artifacts", label: "Artifacts" }
];

export function RequestList({
  requests,
  artifactRows,
  expandedRequestIds,
  selectedArtifactId,
  sortKey,
  sortDirection,
  onChangeSort,
  onToggleExpanded,
  onSelectArtifact
}: Props) {
  if (!requests) {
    return (
      <EmptyState
        title="Request accounting unsupported"
        message="This dashboard API response does not include request accounting. Older captures can still be inspected after refreshing fixtures or upgrading the local API."
      />
    );
  }

  if (requests.rows.length === 0) {
    return <EmptyState title="No requests" message="This run has no request accounting rows to display." />;
  }

  const sortedRows = sortRequests(requests.rows, sortKey, sortDirection);

  return (
    <section className="request-list" aria-label="Requests">
      <header className="request-list-header">
        <div>
          <h2>Requests</h2>
          <p>{requestAvailabilitySummary(requests.availability)}</p>
        </div>
        <div className="request-sort-controls" aria-label="Request sorting">
          <label>
            Category
            <select
              value={sortKey}
              onChange={(event) => onChangeSort({ sortKey: event.target.value as RequestSortKey })}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label>
            Direction
            <select
              value={sortDirection}
              onChange={(event) => onChangeSort({ sortDirection: event.target.value as "asc" | "desc" })}
            >
              <option value="asc">Asc</option>
              <option value="desc">Desc</option>
            </select>
          </label>
        </div>
      </header>
      <div className="request-list-rows">
        {sortedRows.map((request) => (
          <RequestRow
            artifactRows={artifactRows}
            expanded={expandedRequestIds.includes(request.request_id)}
            key={request.request_id}
            request={request}
            selectedArtifactId={selectedArtifactId}
            onSelectArtifact={onSelectArtifact}
            onToggleExpanded={onToggleExpanded}
          />
        ))}
      </div>
    </section>
  );
}

function requestAvailabilitySummary(availability: DashboardRequestAccounting["availability"]): string {
  if (availability.reason) return `*${availability.reason}`;
  return collectionAvailabilityLabel(availability);
}

function sortRequests(
  rows: DashboardRequestAccountingRow[],
  sortKey: RequestSortKey,
  sortDirection: "asc" | "desc"
): DashboardRequestAccountingRow[] {
  return [...rows].sort((left, right) => {
    const compared = compareSortValues(requestSortValue(left, sortKey), requestSortValue(right, sortKey));
    if (compared !== 0) return sortDirection === "asc" ? compared : -compared;
    return left.chronology_index - right.chronology_index;
  });
}

function requestSortValue(request: DashboardRequestAccountingRow, sortKey: RequestSortKey): number | undefined {
  if (sortKey === "time") return requestTimestampValue(request);
  if (sortKey === "input") return request.usage?.uncached_input_tokens;
  if (sortKey === "output") return request.usage?.output_tokens;
  if (sortKey === "cached_read") return request.usage?.cached_input_tokens;
  if (sortKey === "total_tokens") return request.usage?.total_tokens;
  return request.artifact_count;
}

function requestTimestampValue(request: DashboardRequestAccountingRow): number {
  if (!request.timestamp) return request.chronology_index;
  const timestamp = Date.parse(request.timestamp);
  return Number.isNaN(timestamp) ? request.chronology_index : timestamp;
}

function compareSortValues(left: number | undefined, right: number | undefined): number {
  if (left === undefined && right === undefined) return 0;
  if (left === undefined) return 1;
  if (right === undefined) return -1;
  return left - right;
}
