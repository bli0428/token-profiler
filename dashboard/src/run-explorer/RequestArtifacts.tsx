import type { DashboardArtifactDetail, DashboardArtifactRow, DashboardRequestArtifactInclusion } from "../api/types";
import { ArtifactDetailPanel } from "./ArtifactDetailPanel";
import { formatEstimatedTokens } from "./request-format";

type Props = {
  artifacts: DashboardRequestArtifactInclusion[];
  artifactRows: DashboardArtifactRow[];
  selectedArtifactId?: string;
  artifactDetail?: DashboardArtifactDetail;
  artifactDetailLoading?: boolean;
  artifactDetailError?: string;
  onSelectArtifact: (artifactId: string | undefined) => void;
};

export function RequestArtifacts({
  artifacts,
  artifactRows,
  selectedArtifactId,
  artifactDetail,
  artifactDetailLoading = false,
  artifactDetailError,
  onSelectArtifact
}: Props) {
  const detailAvailability = new Map(artifactRows.map((artifact) => [artifact.artifact_id, artifact.detail_available]));

  if (artifacts.length === 0) {
    return <p className="request-empty-note">No request-scoped artifacts are available for this request.</p>;
  }

  return (
    <div className="request-artifacts" aria-label="Request artifacts">
      {artifacts.map((artifact) => {
        const detailAvailable = detailAvailability.get(artifact.artifact_id) ?? false;
        const selected = selectedArtifactId === artifact.artifact_id;
        const selectedDetail = selected && artifactDetail?.artifact_id === artifact.artifact_id ? artifactDetail : undefined;
        return (
          <article
            className={`request-artifact ${selectedArtifactId === artifact.artifact_id ? "is-selected" : ""}`}
            key={`${artifact.artifact_id}-${artifact.request_order}`}
          >
            <div className="request-artifact-main">
              <div>
                <h4>{artifact.display_name}</h4>
                <p>{artifact.display_category}</p>
              </div>
            </div>
            <dl className="request-artifact-metrics">
              <Metric label="Tokens" value={formatEstimatedTokens(normalizedTokenCount(artifact))} />
            </dl>
            {detailAvailable ? (
              <button className="link-button" type="button" onClick={() => onSelectArtifact(selected ? undefined : artifact.artifact_id)}>
                {selected ? "Collapse artifact" : "Expand artifact"}
              </button>
            ) : (
              <span className="request-empty-note">Artifact detail unavailable</span>
            )}
            {selected ? (
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

function normalizedTokenCount(artifact: DashboardRequestArtifactInclusion): number | undefined {
  if (artifact.estimated_cached_input_tokens === undefined || artifact.estimated_uncached_input_tokens === undefined) return undefined;
  return artifact.estimated_cached_input_tokens + artifact.estimated_uncached_input_tokens;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
