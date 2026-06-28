import type { DashboardArtifactRow, DashboardRequestArtifactInclusion } from "../api/types";
import { CaveatList } from "../components/CaveatList";
import { getPrivacyDisplay } from "../policy/privacy-display";
import { formatEstimatedTokens, privacyDisplayState } from "./request-format";

type Props = {
  artifacts: DashboardRequestArtifactInclusion[];
  artifactRows: DashboardArtifactRow[];
  selectedArtifactId?: string;
  onSelectArtifact: (artifactId: string) => void;
};

export function RequestArtifacts({ artifacts, artifactRows, selectedArtifactId, onSelectArtifact }: Props) {
  const detailAvailability = new Map(artifactRows.map((artifact) => [artifact.artifact_id, artifact.detail_available]));

  if (artifacts.length === 0) {
    return <p className="request-empty-note">No request-scoped artifacts are available for this request.</p>;
  }

  return (
    <div className="request-artifacts" aria-label="Request artifacts">
      {artifacts.map((artifact) => {
        const privacy = getPrivacyDisplay(privacyDisplayState(artifact.privacy));
        const detailAvailable = detailAvailability.get(artifact.artifact_id) ?? false;
        return (
          <article
            className={`request-artifact ${selectedArtifactId === artifact.artifact_id ? "is-selected" : ""}`}
            key={`${artifact.artifact_id}-${artifact.request_order}`}
          >
            <div className="request-artifact-main">
              <div>
                <h4>{artifact.display_name}</h4>
                <p>
                  {artifact.display_category} · {artifact.stable_short_id}
                </p>
              </div>
              <span className={`privacy privacy-${privacy.tone}`} title={privacy.description}>
                {privacy.label}
              </span>
            </div>
            <dl className="request-artifact-metrics">
              <Metric label="Local estimate" value={formatEstimatedTokens(artifact.local_token_count)} />
              <Metric label="Estimated cached" value={formatEstimatedTokens(artifact.estimated_cached_input_tokens)} />
              <Metric label="Estimated uncached" value={formatEstimatedTokens(artifact.estimated_uncached_input_tokens)} />
              <Metric label="Attribution" value={artifact.attribution_state.replaceAll("_", " ")} />
            </dl>
            {detailAvailable ? (
              <button className="link-button" type="button" onClick={() => onSelectArtifact(artifact.artifact_id)}>
                Open artifact detail
              </button>
            ) : (
              <span className="request-empty-note">Artifact detail unavailable</span>
            )}
            <CaveatList caveats={artifact.caveats} />
          </article>
        );
      })}
    </div>
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
