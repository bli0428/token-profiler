import { describe, expect, it } from "vitest";
import { defaultViewState } from "../state/view-state";
import { filterAndSortArtifacts } from "../utils/run-filters";
import { createLargeRunFixture } from "../../test/fixtures/large-run-fixture";
import { apiRealFixtures } from "../../test/helpers/contract-fixtures";

describe("run filters", () => {
  it("filters by task, category, and safe search text", () => {
    const task = apiRealFixtures.run.data.task_groups[0]!;
    const artifact = apiRealFixtures.run.data.artifacts.find((row) => row.task_group_ids.includes(task.task_group_id))!;
    const query = artifact.search_text.split(/\s+/)[0] ?? artifact.display_name;
    const rows = filterAndSortArtifacts(apiRealFixtures.run.data.artifacts, {
      ...defaultViewState,
      selectedTaskGroupId: task.task_group_id,
      categoryFilter: artifact.display_category,
      searchQuery: query
    });
    expect(rows.map((row) => row.artifact_id)).toContain(artifact.artifact_id);
  });

  it("sorts by metrics without treating missing values as zero", () => {
    const rows = filterAndSortArtifacts(apiRealFixtures.run.data.artifacts, {
      ...defaultViewState,
      sortKey: "total_exposure",
      sortDirection: "asc"
    });
    expect(rows[0]?.total_exposure).toBeLessThanOrEqual(rows.at(-1)?.total_exposure ?? Number.POSITIVE_INFINITY);
  });

  it("filters and sorts 1,000 artifacts promptly", () => {
    const large = createLargeRunFixture();
    const started = performance.now();
    const rows = filterAndSortArtifacts(large.data.artifacts, {
      ...defaultViewState,
      categoryFilter: "file",
      searchQuery: "large",
      sortKey: "total_exposure"
    });
    expect(rows.length).toBe(250);
    expect(performance.now() - started).toBeLessThan(1000);
  });
});
