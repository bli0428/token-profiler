import { describe, expect, it } from "vitest";
import {
  apiRealFixtures,
  assertArtifactDetailData,
  assertEnvelope,
  assertRunData,
  assertSessionsData,
  assertStatusData
} from "../../test/helpers/contract-fixtures";

describe("API-real contract fixtures", () => {
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
});
