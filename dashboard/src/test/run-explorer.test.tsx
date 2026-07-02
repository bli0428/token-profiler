import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RunExplorer } from "../run-explorer/RunExplorer";
import { defaultViewState, type DashboardViewState } from "../state/view-state";
import { apiRealFixtures } from "../../test/helpers/contract-fixtures";

describe("run explorer", () => {
  it("renders run overview and turn drilldown", () => {
    renderExplorer();
    expect(screen.getByText(apiRealFixtures.sessions.data.sessions[0]!.label ?? apiRealFixtures.sessions.data.sessions[0]!.run_id)).toBeInTheDocument();
    expect(screen.queryByText(apiRealFixtures.run.data.overview.scope)).not.toBeInTheDocument();
    const overviewMetrics = within(screen.getByLabelText("Run token totals"));
    expect(overviewMetrics.getByText("Input")).toBeInTheDocument();
    expect(overviewMetrics.getByText("Output")).toBeInTheDocument();
    expect(overviewMetrics.getByText("Cached Read")).toBeInTheDocument();
    expect(overviewMetrics.getByText("Total Tokens")).toBeInTheDocument();
    expect(overviewMetrics.getByText("Requests")).toBeInTheDocument();
    expect(screen.queryByText("Total exposure")).not.toBeInTheDocument();
    expect(screen.queryByText(apiRealFixtures.run.data.overview.availability.status)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Task groups")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Turns")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: apiRealFixtures.run.data.turns[0]!.display_title })).toBeInTheDocument();
  });

  it("uses the selected session title in the run overview header", () => {
    renderExplorer({
      session: {
        ...apiRealFixtures.sessions.data.sessions[0]!,
        label: "Review artifact conversion types",
        updated_at: "2026-06-28T15:15:07.000Z"
      }
    });
    expect(screen.getByRole("heading", { name: "Review artifact conversion types" })).toBeInTheDocument();
    expect(screen.getByText(new Date("2026-06-28T15:15:07.000Z").toLocaleString())).toBeInTheDocument();
  });

  it("does not render artifact-first filters or task controls", () => {
    let state: DashboardViewState = { ...defaultViewState };
    const { rerender } = renderExplorer({
      viewState: state,
      onChangeViewState: (next) => {
        state = { ...state, ...next };
        rerender(renderExplorerElement(state, (change) => Object.assign(state, change)));
      }
    });
    expect(screen.queryByLabelText("Search")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Task groups")).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Turns")).toBeInTheDocument();
  });

  it("opens artifact detail", () => {
    renderExplorer({
      viewState: {
        ...defaultViewState,
        expandedTurnIds: ["turn:fallback:fixture"],
        expandedRequestIds: ["fixture-request-001"],
        expandedArtifactIds: [apiRealFixtures.artifactDetail.data.artifact_id],
        selectedArtifactId: apiRealFixtures.artifactDetail.data.artifact_id
      },
      details: {
        [apiRealFixtures.artifactDetail.data.artifact_id]: apiRealFixtures.artifactDetail
      }
    });
    const selectedArtifact = screen.getByLabelText("Artifact detail").closest("article");
    expect(selectedArtifact).not.toBeNull();
    expect(within(selectedArtifact!).getByRole("heading", { name: apiRealFixtures.artifactDetail.data.title })).toBeInTheDocument();
    const detail = within(screen.getByLabelText("Artifact detail"));
    expect(detail.queryByText("Hidden")).not.toBeInTheDocument();
    expect(detail.queryByText("Total exposure")).not.toBeInTheDocument();
    expect(detail.queryByText("Repeated exposure")).not.toBeInTheDocument();
    expect(detail.queryByText("Inclusions")).not.toBeInTheDocument();
    expect(detail.queryByText("Identity")).not.toBeInTheDocument();
    expect(detail.queryByText("Artifact ID")).not.toBeInTheDocument();
  });

  it("keeps turn drilldown as the main workflow when artifact detail is selected", () => {
    renderExplorer({
      viewState: {
        ...defaultViewState,
        expandedTurnIds: ["turn:fallback:fixture"],
        expandedRequestIds: ["fixture-request-001"],
        expandedArtifactIds: [apiRealFixtures.artifactDetail.data.artifact_id],
        selectedArtifactId: apiRealFixtures.artifactDetail.data.artifact_id
      },
      details: {
        [apiRealFixtures.artifactDetail.data.artifact_id]: apiRealFixtures.artifactDetail
      }
    });
    expect(screen.getByLabelText("Turns")).toBeInTheDocument();
    expect(screen.getByLabelText("Artifact detail")).toBeInTheDocument();
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
      viewState={viewState}
      session={apiRealFixtures.sessions.data.sessions[0]}
      onChangeViewState={onChangeViewState}
      {...overrides}
    />
  );
}
