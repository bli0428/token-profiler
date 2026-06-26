import { analyzeEvents, toLegacyAggregateSummary } from "./pipeline.ts";

/**
 * Compatibility adapter for the historical aggregate API.
 *
 * New code should call `analyzeEvents()` so it can consume analyzer results,
 * availability states, and caveats directly.
 */
export function aggregateEvents(events: unknown[]) {
  return toLegacyAggregateSummary(analyzeEvents(events));
}
