import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RunExplorer } from "../run-explorer/RunExplorer";
import { defaultViewState, type DashboardViewState } from "../state/view-state";
import { apiRealFixtures } from "../../test/helpers/contract-fixtures";

describe("run explorer", () => {
  it("renders run overview, task groups, and chronological requests", () => {
    renderExplorer();
    expect(screen.getByText(apiRealFixtures.run.data.overview.scope_label)).toBeInTheDocument();
    expect(screen.getAllByText(apiRealFixtures.run.data.task_groups[0]!.display_name).length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Chronological requests")).toBeInTheDocument();
    expect(screen.getByLabelText("Request 1")).toHaveTextContent(apiRealFixtures.run.data.requests.rows[0]!.request_id);
  });

  it("preserves task group selection without returning to artifact-first layout", () => {
    let state: DashboardViewState = { ...defaultViewState };
    const { rerender } = renderExplorer({
      viewState: state,
      onChangeViewState: (next) => {
        state = { ...state, ...next };
        rerender(renderExplorerElement(state, (change) => Object.assign(state, change)));
      }
    });
    expect(screen.queryByLabelText("Search")).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Chronological requests")).toBeInTheDocument();
  });

  it("opens artifact detail", () => {
    renderExplorer({ viewState: { ...defaultViewState, selectedArtifactId: "artifact-plan" }, detail: apiRealFixtures.artifactDetail });
    expect(within(screen.getByLabelText("Artifact detail")).getAllByText("Identity").length).toBeGreaterThan(0);
  });

  it("keeps request-first view as the main workflow when artifact detail is selected", () => {
    renderExplorer({
      viewState: {
        ...defaultViewState,
        expandedRequestIds: ["fixture-request-001"],
        selectedArtifactId: "USER_MESSAGE:message:user:6:16"
      },
      detail: apiRealFixtures.artifactDetail
    });
    expect(screen.getByLabelText("Chronological requests")).toBeInTheDocument();
    expect(within(screen.getByLabelText("Artifact detail")).getAllByText("Identity").length).toBeGreaterThan(0);
  });
});

function renderExplorer(overrides: Partial<Parameters<typeof RunExplorer>[0]> = {}) {
  return render(renderExplorerElement(overrides.viewState ?? defaultViewState, overrides.onChangeViewState ?? (() => undefined), overrides));
}

function renderExplorerElement(
  viewState: DashboardViewState,
  onChangeViewState: (next: Partial<DashboardViewState>) => void,
  overrides: Partial<Parameters<typeof RunExplorer>[0]> = {}
) {
  return (
    <RunExplorer
      run={apiRealFixtures.run.data}
      detailLoading={false}
      viewState={viewState}
      onChangeViewState={onChangeViewState}
      {...overrides}
    />
  );
}
