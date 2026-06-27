import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  apiRealFixtures,
  assertArtifactDetailData,
  assertBaselineRelationships,
  assertEnvelope,
  assertNoGeneratedRawContent,
  assertRunData,
  assertSessionsData,
  assertSourceMetadata,
  assertStatusData
} from "../../test/helpers/contract-fixtures";

describe("API-real contract fixtures", () => {
  it("validates source metadata and baseline relationships", () => {
    assertSourceMetadata(apiRealFixtures.source);
    assertBaselineRelationships();
  });

  it("keeps source metadata deterministically formatted", () => {
    const sourcePath = join(process.cwd(), "test", "fixtures", "api-real", "source.json");
    const sourceText = readFileSync(sourcePath, "utf8");
    expect(sourceText).toBe(`${stableStringify(JSON.parse(sourceText))}\n`);
  });

  it("validates status fixture envelope and data", () => {
    assertEnvelope(apiRealFixtures.status);
    assertStatusData(apiRealFixtures.status.data);
  });

  it("validates session fixture envelope and routable run ids", () => {
    assertEnvelope(apiRealFixtures.sessions);
    assertSessionsData(apiRealFixtures.sessions.data);
  });

  it("validates selected run fixture shape", () => {
    assertEnvelope(apiRealFixtures.run);
    assertRunData(apiRealFixtures.run.data);
  });

  it("validates artifact detail and hidden raw content rules", () => {
    assertEnvelope(apiRealFixtures.artifactDetail);
    assertArtifactDetailData(apiRealFixtures.artifactDetail.data);
  });

  it("contains no generated raw content strings in API-real baselines", () => {
    assertNoGeneratedRawContent(apiRealFixtures.status);
    assertNoGeneratedRawContent(apiRealFixtures.sessions);
    assertNoGeneratedRawContent(apiRealFixtures.run);
    assertNoGeneratedRawContent(apiRealFixtures.artifactDetail);
  });
});

function stableStringify(value: unknown): string {
  return JSON.stringify(sortJson(value), null, 2);
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, nested]) => [key, sortJson(nested)]));
}
