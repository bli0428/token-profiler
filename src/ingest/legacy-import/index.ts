import { validateEvent } from "../../core/events/index.ts";

export function importLegacyEvents(events) {
  return events.map((event, index) => importLegacyEvent(event, index + 1));
}

export function importLegacyEvent(event, lineNumber = 1) {
  try {
    if (event?.event_kind === "request_usage") return validateEvent(event);
    if (event?.event_kind === "artifact" && isNewArtifactEvent(event)) return validateEvent(event);
    return validateEvent(convertLegacyArtifactEvent(event));
  } catch (error) {
    throw new Error(`Invalid event at line ${lineNumber}: ${error.message}`);
  }
}

function isNewArtifactEvent(event) {
  return event.local_token_count !== undefined && event.storage_mode !== undefined;
}

function convertLegacyArtifactEvent(event) {
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    throw new Error("Legacy event must be an object.");
  }

  const converted = {
    ...event,
    event_kind: "artifact",
    local_token_count: event.local_token_count ?? event.token_count,
    storage_mode: event.storage_mode ?? ("content" in event ? "raw" : "metadata"),
    metadata: event.metadata ?? {}
  };
  delete converted.token_count;
  return converted;
}
