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
          const limitations = [...session.identity.limitations, ...(session.availability.limitations ?? [])];
          const groupingLabel = sessionGroupingLabel(session);
          return (
            <button
              aria-current={session.run_id === selectedRunId ? "true" : undefined}
              className={`session-row ${session.run_id === selectedRunId ? "is-selected" : ""}`}
              key={session.run_id}
              type="button"
              onClick={() => onSelect(session.run_id)}
            >
              <span className="session-updated">{session.updated_at ? new Date(session.updated_at).toLocaleString() : "Updated time unavailable"}</span>
              <span className="session-title">{session.label ?? session.run_id}</span>
              {/* <span className={`session-grouping session-grouping--${groupingLabel.tone}`} title={groupingLabel.description}>
                {groupingLabel.label}
              </span> */}
              {/* <span className="session-metrics" aria-label="Session token totals">
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
              </span> */}
              <span className="session-counts">
                {formatCount(totalTokens(session))} total tokens
              </span>
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

function totalTokens(session: DashboardSession): number | undefined {
  if (session.input_tokens === undefined || session.output_tokens === undefined) return undefined;
  return session.input_tokens + session.output_tokens;
}

function sessionGroupingLabel(session: DashboardSession): { label: string; description: string; tone: "direct" | "fallback" | "unknown" } {
  const { identity } = session;
  if (identity.mapping_confidence === "one_to_one" && identity.mapping_source === "direct_session_id" && identity.codex_session_id) {
    return {
      label: "Codex session",
      description: `Grouped by Codex session ${identity.codex_session_id}.`,
      tone: "direct"
    };
  }

  if (identity.mapping_source === "cache_key") {
    return {
      label: "Cache-key fallback",
      description: "Grouped by cache-key route identity, not confirmed as a one-to-one Codex session.",
      tone: "fallback"
    };
  }

  if (identity.mapping_source === "fallback_fingerprint" || identity.mapping_confidence === "best_effort") {
    return {
      label: "Fallback group",
      description: "Grouped by local fallback identity.",
      tone: "fallback"
    };
  }

  return {
    label: "Identity unavailable",
    description: "Codex session identity was not available for this row.",
    tone: "unknown"
  };
}
