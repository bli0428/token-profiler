import type { DashboardArtifactRow, DashboardTurnGroup } from "../api/types";
import { EmptyState } from "../components/EmptyState";
import { TurnRow } from "./TurnRow";

type Props = {
  turns: DashboardTurnGroup[];
  artifactRows: DashboardArtifactRow[];
  expandedTurnIds: string[];
  expandedRequestIds: string[];
  selectedArtifactId?: string;
  onToggleTurn: (turnId: string) => void;
  onToggleRequest: (requestId: string) => void;
  onSelectArtifact: (artifactId: string) => void;
};

export function TurnList({
  turns,
  artifactRows,
  expandedTurnIds,
  expandedRequestIds,
  selectedArtifactId,
  onToggleTurn,
  onToggleRequest,
  onSelectArtifact
}: Props) {
  if (turns.length === 0) {
    return <EmptyState title="No turns" message="This run has no turn groups to display." />;
  }

  return (
    <section className="turn-list" aria-label="Turns">
      <header className="turn-list-header">
        <div>
          <h2>Turns</h2>
          <p>{turns.length} turn{turns.length === 1 ? "" : "s"} · {turns.reduce((total, turn) => total + turn.requests.length, 0)} requests</p>
        </div>
      </header>
      <div className="turn-list-rows">
        {turns.map((turn, index) => (
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
