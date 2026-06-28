import { asResponsesInputItems, asResponsesRequest } from "./payload.ts";
import {
  extractInputItemArtifacts,
  extractInstructionsArtifact,
  extractToolDefinitionArtifacts,
  indexToolCalls
} from "./input-items.ts";
import type { CodexExtractedArtifact } from "./types.ts";

export function extractResponsesArtifacts(payload: unknown): CodexExtractedArtifact[] {
  const request = asResponsesRequest(payload);
  const inputs = asResponsesInputItems(request.input);
  const callsById = indexToolCalls(inputs);

  return [
    ...extractInstructionsArtifact(request),
    ...extractToolDefinitionArtifacts(request.tools),
    ...inputs.flatMap((item, index) => extractInputItemArtifacts({
      item,
      index,
      callsById
    }))
  ];
}
