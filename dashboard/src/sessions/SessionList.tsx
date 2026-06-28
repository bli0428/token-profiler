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
        {sessions.map((session) => {
          const identity = session.identity.codex_label ?? session.identity.codex_session_id ?? session.identity.codex_conversation_id;
          const limitations = [...session.identity.limitations, ...(session.availability.limitations ?? [])];
          return (
            <button
              aria-current={session.run_id === selectedRunId ? "true" : undefined}
              className={`session-row ${session.run_id === selectedRunId ? "is-selected" : ""}`}
              key={session.run_id}
              type="button"
              onClick={() => onSelect(session.run_id)}
            >
              <span className="session-title">{session.label ?? session.run_id}</span>
              <span className="session-updated">{session.updated_at ? new Date(session.updated_at).toLocaleString() : "Updated time unavailable"}</span>
              <span className="session-identity">
                {identity ? `Codex: ${identity}` : "Codex identity unavailable"}
                <span className="session-confidence">{session.identity.mapping_confidence.replaceAll("_", " ")}</span>
              </span>
              <span className="session-metrics" aria-label="Session token totals">
                <span>
                  <strong>{formatCount(session.input_tokens)}</strong>
                  input
                </span>
                <span>
                  <strong>{formatCount(session.cached_input_tokens)}</strong>
                  cached
                </span>
                <span>
                  <strong>{formatCount(session.uncached_input_tokens)}</strong>
                  uncached
                </span>
                <span>
                  <strong>{formatCount(session.output_tokens)}</strong>
                  output
                </span>
              </span>
              <span className="session-counts">
                {formatCount(session.request_count)} requests · {formatCount(session.artifact_count)} artifacts
              </span>
              <span className={`availability availability-${session.availability.status}`}>{session.availability.status}</span>
              {limitations.length > 0 ? <span className="session-limitations">{limitations.join(" ")}</span> : null}
              <CaveatList caveats={session.caveats} />
            </button>
          );
        })}
      </div>
    </section>
  );
}

function formatCount(value: number | undefined): string {
  if (value === undefined) return "Unavailable";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}
