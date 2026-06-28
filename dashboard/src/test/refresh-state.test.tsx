import { describe, expect, it } from "vitest";
import { reconcileRun, reconcileSessions } from "../state/reconcile";
import { defaultViewState } from "../state/view-state";
import { apiRealFixtures } from "../../test/helpers/contract-fixtures";

describe("refresh reconciliation", () => {
  it("preserves selected session, task, artifact, filter, and sort when entities still exist", () => {
    const session = apiRealFixtures.sessions.data.sessions[0]!;
    const task = apiRealFixtures.run.data.task_groups[0]!;
    const artifact = apiRealFixtures.run.data.artifacts.find((row) => row.task_group_ids.includes(task.task_group_id))!;
    const state = {
      ...defaultViewState,
      selectedRunId: session.run_id,
      selectedTaskGroupId: task.task_group_id,
      selectedArtifactId: artifact.artifact_id,
      expandedRequestIds: [apiRealFixtures.run.data.requests.rows[0]!.request_id],
      categoryFilter: artifact.display_category,
      sortKey: "display_name" as const
    };
    expect(reconcileRun(reconcileSessions(state, apiRealFixtures.sessions.data.sessions), apiRealFixtures.run.data)).toEqual(state);
  });

  it("clears invalid selections after refresh", () => {
    const state = {
      ...defaultViewState,
      selectedRunId: "missing",
      selectedTaskGroupId: "missing-task",
      selectedArtifactId: "missing-artifact",
      expandedRequestIds: ["missing-request"]
    };
    const next = reconcileRun(reconcileSessions(state, apiRealFixtures.sessions.data.sessions), apiRealFixtures.run.data);
    expect(next.selectedRunId).toBeUndefined();
    expect(next.selectedTaskGroupId).toBeUndefined();
    expect(next.selectedArtifactId).toBeUndefined();
    expect(next.expandedRequestIds).toEqual([]);
  });

  it("clears expanded requests that are not present after refresh", () => {
    const request = apiRealFixtures.run.data.requests.rows[0]!;
    const state = {
      ...defaultViewState,
      selectedRunId: apiRealFixtures.run.data.run_id,
      expandedRequestIds: [request.request_id, "missing-request"]
    };
    const next = reconcileRun(state, apiRealFixtures.run.data);
    expect(next.expandedRequestIds).toEqual([request.request_id]);
  });
});
