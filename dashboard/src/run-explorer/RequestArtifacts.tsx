import type { DashboardArtifactDetail, DashboardArtifactRow, DashboardRequestArtifactInclusion } from "../api/types";
import { ArtifactDetailPanel } from "./ArtifactDetailPanel";
import { formatEstimatedTokens } from "./request-format";

type Props = {
  artifacts: DashboardRequestArtifactInclusion[];
  artifactRows: DashboardArtifactRow[];
  requestId: string;
  expandedArtifactIds: string[];
  selectedArtifactId?: string;
  artifactDetails?: Record<string, DashboardArtifactDetail>;
  loadingArtifactIds?: string[];
  artifactErrors?: Record<string, string | undefined>;
  onToggleArtifact: (artifactId: string | undefined) => void;
};

export function RequestArtifacts({
  artifacts,
  artifactRows,
  requestId,
  expandedArtifactIds,
  selectedArtifactId,
  artifactDetails = {},
  loadingArtifactIds = [],
  artifactErrors = {},
  onToggleArtifact
}: Props) {
  const detailAvailability = new Map(artifactRows.map((artifact) => [artifact.artifact_id, artifact.detail_available]));

  if (artifacts.length === 0) {
    return <p className="request-empty-note">No request-scoped artifacts are available for this request.</p>;
  }

  return (
    <div className="request-artifacts" aria-label="Request artifacts">
      {artifacts.map((artifact) => {
        const detailAvailable = detailAvailability.get(artifact.artifact_id) ?? false;
        const expanded = expandedArtifactIds.includes(artifact.artifact_id);
        const selected = selectedArtifactId === artifact.artifact_id;
        const selectedDetail = expanded ? artifactDetails[artifact.artifact_id] : undefined;
        const artifactDetailLoading = loadingArtifactIds.includes(artifact.artifact_id);
        const artifactDetailError = artifactErrors[artifact.artifact_id];
        const showTokenMetric = !isReasoningState(artifact);
        return (
          <article
            className={`request-artifact ${selectedArtifactId === artifact.artifact_id ? "is-selected" : ""}`}
            id={artifactInstanceDomId(requestId, artifact.artifact_id, artifact.request_order)}
            key={`${artifact.artifact_id}-${artifact.request_order}`}
          >
            <div className="request-artifact-main">
              <div>
                <h4>{artifact.display_name}</h4>
                <p>{formatArtifactCategory(artifact.display_category)}</p>
              </div>
            </div>
            {showTokenMetric ? (
              <dl className="request-artifact-metrics">
                <Metric label="Tokens" value={formatEstimatedTokens(normalizedTokenCount(artifact))} />
            </dl>
            ) : null}
            {detailAvailable ? (
              <button className="link-button" type="button" onClick={() => onToggleArtifact(artifact.artifact_id)}>
                {expanded ? "Collapse artifact" : "Expand artifact"}
              </button>
            ) : (
              <span className="request-empty-note">Artifact detail unavailable</span>
            )}
            {expanded ? (
              <ArtifactDetailPanel
                detail={selectedDetail}
                loading={artifactDetailLoading || (!selectedDetail && !artifactDetailError)}
                errorMessage={artifactDetailError}
                inline
              />
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function artifactInstanceDomId(requestId: string, artifactId: string, requestOrder: number): string {
  return `artifact-${safeDomId(requestId)}-${safeDomId(artifactId)}-${requestOrder}`;
}

function safeDomId(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]+/g, "_");
}

function isReasoningState(artifact: DashboardRequestArtifactInclusion): boolean {
  return artifact.display_category === "reasoning_state" || /^SUMMARY:input:reasoning:\d+$/.test(artifact.artifact_id);
}

function normalizedTokenCount(artifact: DashboardRequestArtifactInclusion): number | undefined {
  if (artifact.estimated_cached_input_tokens === undefined || artifact.estimated_uncached_input_tokens === undefined) return undefined;
  return artifact.estimated_cached_input_tokens + artifact.estimated_uncached_input_tokens;
}

function formatArtifactCategory(category: string): string {
  if (category === "reasoning_state") return "Reasoning state";
  return category.replace(/_/g, " ");
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
