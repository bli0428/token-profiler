import type { DashboardSession } from "../api/types";
import { CaveatList } from "../components/CaveatList";

type Props = {
  sessions: DashboardSession[];
  selectedRunId?: string;
  onSelect: (runId: string) => void;
};

export function SessionList({ sessions, selectedRunId, onSelect }: Props) {
  return (
    <section className="sessions-pane" aria-label="Sessions">
      <h2>Sessions</h2>
      <div className="session-list">
        {sessions.map((session) => (
          <button
            className={`session-row ${session.run_id === selectedRunId ? "is-selected" : ""}`}
            key={session.run_id}
            type="button"
            onClick={() => onSelect(session.run_id)}
          >
            <span className="session-title">{session.label ?? session.run_id}</span>
            <span>{session.updated_at ? new Date(session.updated_at).toLocaleString() : "Updated time unavailable"}</span>
            <span>{session.artifact_count ?? "Unknown"} artifacts</span>
            <span className={`availability availability-${session.availability.status}`}>{session.availability.status}</span>
            <CaveatList caveats={session.caveats} />
          </button>
        ))}
      </div>
    </section>
  );
}
