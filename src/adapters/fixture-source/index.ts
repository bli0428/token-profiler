/**
 * Test-only adapter used to validate the adapter seam with a non-Codex source.
 *
 * This is not a real integration. Future adapters such as Claude Code should be
 * sibling adapters that emit the same canonical record shapes.
 */
import { TokenProfiler } from "../../core/capture/index.ts";
import { createRequestUsageEvent } from "../../core/events/index.ts";

export const FIXTURE_SOURCE_ID = "fixture-source";
export const FIXTURE_ADAPTER_VERSION = "1";

type FixtureSourceOptions = {
  runId: string;
  rootDir?: string;
  storageMode?: string;
};

export async function writeFixtureSourceRun({
  runId,
  rootDir,
  storageMode = "metadata"
}: FixtureSourceOptions): Promise<{ artifactCount: number; usageCount: number; limitationCount: number }> {
  const profiler = new TokenProfiler({
    runId,
    ...(rootDir ? { rootDir } : {}),
    storageMode
  });
  const sourceMetadata = {
    source_id: FIXTURE_SOURCE_ID,
    capture_method: "fixture",
    adapter_version: FIXTURE_ADAPTER_VERSION
  };

  await profiler.recordAsync({
    requestId: "fixture_request_0001",
    artifactType: "USER_MESSAGE",
    artifactName: "fixture:user-message",
    artifactId: "USER_MESSAGE:fixture:user-message",
    content: "Summarize the fixture-only source seam.",
    metadata: {
      ...sourceMetadata,
      content_kind: "message"
    },
    artifactIndex: 0,
    tokenStart: 0,
    tokenEnd: 8
  });

  // Until limitations become a first-class event kind, the seam test represents
  // source limitations as canonical metadata on a SUMMARY artifact.
  await profiler.recordAsync({
    requestId: "fixture_request_0001",
    artifactType: "SUMMARY",
    artifactName: "fixture-source-limitation:prompt-composition",
    artifactId: "SUMMARY:fixture-source-limitation:prompt-composition",
    content: "Fixture source does not expose exact prompt composition.",
    metadata: {
      ...sourceMetadata,
      content_kind: "source_limitation",
      limitation_code: "prompt_composition_unavailable",
      limitation_severity: "partial",
      applies_to: "request",
      display_name: "Prompt composition unavailable"
    },
    artifactIndex: 1,
    tokenStart: 8,
    tokenEnd: 16
  });

  await profiler.store.append(createRequestUsageEvent({
    runId,
    requestId: "fixture_request_0001",
    responseId: "fixture_response_0001",
    usage: {
      input_tokens: 16,
      cached_input_tokens: 0,
      output_tokens: 4,
      total_tokens: 20
    },
    timestamp: new Date().toISOString()
  }));

  return { artifactCount: 2, usageCount: 1, limitationCount: 1 };
}
