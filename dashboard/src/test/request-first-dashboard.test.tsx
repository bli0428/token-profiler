import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { DashboardRun } from "../api/types";
import { RequestList } from "../run-explorer/RequestList";
import { RunExplorer } from "../run-explorer/RunExplorer";
import { defaultViewState, type DashboardViewState } from "../state/view-state";
import { apiRealFixtures } from "../../test/helpers/contract-fixtures";

describe("request-first dashboard", () => {
  it("renders chronological request rows as the default center pane", () => {
    const run = withAdditionalRequest(apiRealFixtures.run.data);
    renderExplorer({ run });

    const requestList = screen.getByLabelText("Chronological requests");
    const rows = within(requestList).getAllByLabelText(/Request \d+/);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("fixture-request-001");
    expect(rows[1]).toHaveTextContent("fixture-request-002");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows provider token totals and unavailable labels without expanding", () => {
    const run = withAdditionalRequest(apiRealFixtures.run.data, { missingUsage: true });
    renderExplorer({ run });

    expect(screen.getByText("563,810")).toBeInTheDocument();
    expect(screen.getByText("424,832")).toBeInTheDocument();
    expect(screen.getByText("138,978")).toBeInTheDocument();
    expect(screen.getAllByText("Unavailable").length).toBeGreaterThanOrEqual(5);
  });

  it("expands request artifacts with keyboard-accessible state", async () => {
    const user = userEvent.setup();
    let state: DashboardViewState = { ...defaultViewState };
    const onChangeViewState = vi.fn((next: Partial<DashboardViewState>) => {
      state = { ...state, ...next };
    });
    const { rerender } = renderExplorer({ viewState: state, onChangeViewState });

    const toggle = screen.getByRole("button", { name: "Expand artifacts" });
    toggle.focus();
    await user.keyboard("{Enter}");

    expect(onChangeViewState).toHaveBeenCalledWith({ expandedRequestIds: ["fixture-request-001"] });
    rerender(renderExplorerElement({ ...state, expandedRequestIds: ["fixture-request-001"] }, onChangeViewState));

    expect(screen.getByRole("button", { name: "Collapse artifacts", expanded: true })).toBeInTheDocument();
    expect(screen.getByLabelText("Request artifacts")).toBeInTheDocument();
    expect(screen.getAllByText("~1,642").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Hidden").length).toBeGreaterThan(0);
  });

  it("selects artifact detail from a request inclusion", async () => {
    const user = userEvent.setup();
    const onChangeViewState = vi.fn();
    renderExplorer({ viewState: { ...defaultViewState, expandedRequestIds: ["fixture-request-001"] }, onChangeViewState });

    await user.click(screen.getAllByRole("button", { name: "Open artifact detail" })[0]!);

    expect(onChangeViewState).toHaveBeenCalledWith({ selectedArtifactId: "USER_MESSAGE:message:user:6:16" });
  });

  it("renders unsupported and empty request accounting states explicitly", () => {
    const { rerender } = render(
      <RequestList
        artifactRows={[]}
        expandedRequestIds={[]}
        onSelectArtifact={() => undefined}
        onToggleExpanded={() => undefined}
      />
    );
    expect(screen.getByText("Request accounting unsupported")).toBeInTheDocument();

    rerender(
      <RequestList
        requests={{ ...apiRealFixtures.run.data.requests, rows: [], summary: { ...apiRealFixtures.run.data.requests.summary, request_count: 0 } }}
        artifactRows={[]}
        expandedRequestIds={[]}
        onSelectArtifact={() => undefined}
        onToggleExpanded={() => undefined}
      />
    );
    expect(screen.getByText("No requests")).toBeInTheDocument();
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

function withAdditionalRequest(run: DashboardRun, options: { missingUsage?: boolean } = {}): DashboardRun {
  const first = run.requests.rows[0]!;
  const second = {
    ...first,
    request_id: "fixture-request-002",
    chronology_index: 1,
    usage: options.missingUsage ? undefined : { ...first.usage!, total_tokens: first.usage!.total_tokens + 1000 },
    availability: options.missingUsage
      ? {
          status: "partial" as const,
          usage_status: "missing" as const,
          attribution_status: "partial" as const,
          missing_facts: ["request_usage"],
          limitations: ["Provider usage was not reported."]
        }
      : first.availability,
    artifact_inclusions: [],
    artifact_count: 0,
    total_local_artifact_tokens: 0,
    caveats: []
  };
  return {
    ...run,
    requests: {
      ...run.requests,
      summary: {
        ...run.requests.summary,
        request_count: 2,
        usage_incomplete_count: options.missingUsage ? run.requests.summary.usage_incomplete_count + 1 : run.requests.summary.usage_incomplete_count
      },
      rows: [first, second]
    }
  };
}
