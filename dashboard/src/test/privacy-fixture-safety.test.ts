import { describe, expect, it } from "vitest";
import { createLargeRunFixture } from "../../test/fixtures/large-run-fixture";
import * as edgeFixtures from "../../test/fixtures/edge-fixtures";
import { apiRealFixtures } from "../../test/helpers/contract-fixtures";

describe("privacy fixture safety", () => {
  it("keeps raw content strings out of committed dashboard fixtures", () => {
    const offenders: string[] = [];
    collectRawContentStrings(apiRealFixtures, "apiRealFixtures", offenders);
    collectRawContentStrings(edgeFixtures, "edgeFixtures", offenders);
    collectRawContentStrings(createLargeRunFixture(), "largeRunFixture", offenders);

    expect(offenders).toEqual([]);
  });
});

function collectRawContentStrings(value: unknown, path: string, offenders: string[]) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectRawContentStrings(item, `${path}[${index}]`, offenders));
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    const nestedPath = `${path}.${key}`;
    if (key === "raw" && typeof nested === "string" && nested.length > 0) offenders.push(nestedPath);
    collectRawContentStrings(nested, nestedPath, offenders);
  }
}
