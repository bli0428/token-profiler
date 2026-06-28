import type { DashboardArtifactRow, DashboardRequestAccounting } from "../api/types";
import { CaveatList } from "../components/CaveatList";
import { EmptyState } from "../components/EmptyState";
import { collectionAvailabilityLabel } from "./request-format";
import { RequestRow } from "./RequestRow";

type Props = {
  requests?: DashboardRequestAccounting;
  artifactRows: DashboardArtifactRow[];
  expandedRequestIds: string[];
  selectedArtifactId?: string;
  onToggleExpanded: (requestId: string) => void;
  onSelectArtifact: (artifactId: string) => void;
};

export function RequestList({ requests, artifactRows, expandedRequestIds, selectedArtifactId, onToggleExpanded, onSelectArtifact }: Props) {
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

  return (
    <section className="request-list" aria-label="Chronological requests">
      <header className="request-list-header">
        <div>
          <h2>Requests</h2>
          <p>{collectionAvailabilityLabel(requests.availability)}</p>
        </div>
        <dl className="request-summary">
          <div>
            <dt>Requests</dt>
            <dd>{requests.summary.request_count}</dd>
          </div>
          <div>
            <dt>Reported</dt>
            <dd>{requests.summary.usage_reported_count}</dd>
          </div>
          <div>
            <dt>Partial</dt>
            <dd>{requests.summary.usage_incomplete_count}</dd>
          </div>
        </dl>
      </header>
      <CaveatList caveats={requests.caveats} />
      <div className="request-list-rows">
        {requests.rows.map((request) => (
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
