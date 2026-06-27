import type { DashboardArtifactRow } from "../api/types";
import { EmptyState } from "../components/EmptyState";
import { getPrivacyDisplay } from "../policy/privacy-display";

type Props = {
  artifacts: DashboardArtifactRow[];
  selectedArtifactId?: string;
  onSelect: (artifactId: string) => void;
};

export function ArtifactTable({ artifacts, selectedArtifactId, onSelect }: Props) {
  if (artifacts.length === 0) {
    return <EmptyState title="No matching artifacts" message="The selected session and filters remain active." />;
  }
  return (
    <div className="table-wrap">
      <table className="artifact-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>Task</th>
            <th>Privacy</th>
            <th>Total</th>
            <th>Repeated</th>
          </tr>
        </thead>
        <tbody>
          {artifacts.map((artifact) => {
            const privacy = getPrivacyDisplay(artifact.preview_state);
            return (
              <tr
                className={artifact.artifact_id === selectedArtifactId ? "is-selected" : ""}
                key={artifact.artifact_id}
                onClick={() => onSelect(artifact.artifact_id)}
              >
                <td>
                  <button type="button" onClick={() => onSelect(artifact.artifact_id)}>
                    {artifact.display_name}
                  </button>
                </td>
                <td>{artifact.display_category}</td>
                <td>{artifact.task_group_ids.length > 0 ? artifact.task_group_ids.join(", ") : "Unscoped"}</td>
                <td>
                  <span className={`privacy privacy-${privacy.tone}`}>{privacy.label}</span>
                </td>
                <td>{artifact.total_exposure ?? "Unavailable"}</td>
                <td>{artifact.repeated_exposure ?? "Unavailable"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
