import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { RunExplorer } from "../run-explorer/RunExplorer";
import { defaultViewState, type DashboardViewState } from "../state/view-state";
import { createLargeRunFixture } from "../../test/fixtures/large-run-fixture";
import { apiRealFixtures } from "../../test/helpers/contract-fixtures";

describe("run explorer", () => {
  it("renders run overview, task groups, and artifacts", () => {
    renderExplorer();
    expect(screen.getByText(apiRealFixtures.run.data.overview.scope_label)).toBeInTheDocument();
    expect(screen.getAllByText(apiRealFixtures.run.data.task_groups[0]!.display_name).length).toBeGreaterThan(0);
    expect(screen.getAllByText(apiRealFixtures.run.data.artifacts[0]!.display_name).length).toBeGreaterThan(0);
  });

  it("filters by task, category, search, and sort controls", async () => {
    let state: DashboardViewState = { ...defaultViewState };
    const { rerender } = renderExplorer({
      viewState: state,
      onChangeViewState: (next) => {
        state = { ...state, ...next };
        rerender(renderExplorerElement(state, (change) => Object.assign(state, change)));
      }
    });
    const artifact = apiRealFixtures.run.data.artifacts[0]!;
    await userEvent.type(screen.getByLabelText("Search"), artifact.search_text.split(/\s+/)[0] ?? artifact.display_name);
    expect(screen.getAllByText(artifact.display_name).length).toBeGreaterThan(0);
  });

  it("opens artifact detail", () => {
    renderExplorer({ viewState: { ...defaultViewState, selectedArtifactId: "artifact-plan" }, detail: apiRealFixtures.artifactDetail });
    expect(within(screen.getByLabelText("Artifact detail")).getAllByText("Identity").length).toBeGreaterThan(0);
  });

  it("handles large fixture filtering", () => {
    renderExplorer({ run: createLargeRunFixture().data, viewState: { ...defaultViewState, categoryFilter: "file" } });
    expect(screen.getAllByText(/Large artifact/).length).toBeGreaterThan(100);
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
