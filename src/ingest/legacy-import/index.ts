import { validateEvent } from "../../core/events/index.ts";

export function importLegacyEvents(events: unknown[]) {
  return events.map((event: unknown, index: number) => importLegacyEvent(event, index + 1));
}

export function importLegacyEvent(event: unknown, lineNumber = 1) {
  try {
    if (isObjectRecord(event) && event.event_kind === "request_usage") return validateEvent(event);
    if (isObjectRecord(event) && event.event_kind === "artifact" && isNewArtifactEvent(event)) return validateEvent(event);
    return validateEvent(convertLegacyArtifactEvent(event));
  } catch (error) {
    throw new Error(`Invalid event at line ${lineNumber}: ${(error as Error).message}`);
  }
}

function isObjectRecord(value: unknown): value is Record<string, any> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isNewArtifactEvent(event: any): boolean {
  return event.local_token_count !== undefined && event.storage_mode !== undefined;
}

function convertLegacyArtifactEvent(event: any) {
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
