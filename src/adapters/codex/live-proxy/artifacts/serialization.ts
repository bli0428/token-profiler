import type { CodexCaptureRecord, CodexExtractedArtifact } from "./types.ts";

export function toCaptureRecord(artifact: CodexExtractedArtifact): CodexCaptureRecord {
  switch (artifact.kind) {
    case "system_instruction":
      return {
        artifactType: artifact.artifactType,
        artifactName: artifact.artifactName,
        artifactId: artifact.artifactId,
        content: artifact.content
      };
    case "tool_definition":
      return {
        artifactType: artifact.artifactType,
        artifactName: artifact.artifactName,
        artifactId: artifact.artifactId,
        content: artifact.content
      };
    case "message":
      return {
        artifactType: artifact.artifactType,
        artifactName: artifact.artifactName,
        artifactId: artifact.artifactId,
        content: artifact.content
      };
    case "tool_call":
      return {
        artifactType: artifact.artifactType,
        artifactName: artifact.artifactName,
        artifactId: artifact.artifactId,
        content: artifact.content,
        metadata: artifact.metadata
      };
    case "patch":
      return {
        artifactType: artifact.artifactType,
        artifactName: artifact.artifactName,
        artifactId: artifact.artifactId,
        content: artifact.content,
        metadata: artifact.metadata
      };
    case "tool_output":
      return {
        artifactType: artifact.artifactType,
        artifactName: artifact.artifactName,
        artifactId: artifact.artifactId,
        content: artifact.content,
        metadata: artifact.metadata
      };
    case "unknown_input":
      return {
        artifactType: artifact.artifactType,
        artifactName: artifact.artifactName,
        artifactId: artifact.artifactId,
        content: artifact.content,
        metadata: artifact.metadata
      };
    default:
      return assertNever(artifact);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unsupported Codex artifact kind: ${JSON.stringify(value)}`);
}
