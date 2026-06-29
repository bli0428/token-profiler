import { validateEvent } from "../core/events/index.ts";
import type { CanonicalEvent } from "../core/events/types.ts";
import type { PreparedRunData } from "./types.ts";

/**
 * Validates raw stored records and groups them by canonical event kind.
 *
 * Artifact events are sorted by timestamp and request ID so exposure/replay
 * calculations have deterministic first-seen semantics for content hashes.
 */
export function prepareRunData(events: unknown[]): PreparedRunData {
  const canonicalEvents = events.map((event) => validateEvent(event));
  const artifactEvents = canonicalEvents
    .filter((event): event is Extract<CanonicalEvent, { event_kind: "artifact" }> => event.event_kind === "artifact")
    .sort((a, b) => {
      const timeComparison = String(a.timestamp).localeCompare(String(b.timestamp));
      return timeComparison || String(a.request_id).localeCompare(String(b.request_id));
    });
  const usageEvents = canonicalEvents
    .filter((event): event is Extract<CanonicalEvent, { event_kind: "request_usage" }> => event.event_kind === "request_usage");
  const turnIdentityEvents = canonicalEvents
    .filter((event): event is Extract<CanonicalEvent, { event_kind: "request_turn_identity" }> => event.event_kind === "request_turn_identity");
  const run_id = canonicalEvents.find((event) => event.run_id)?.run_id;

  return {
    ...(run_id ? { run_id } : {}),
    events: canonicalEvents,
    artifactEvents,
    usageEvents,
    turnIdentityEvents
  };
}
