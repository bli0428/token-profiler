import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { DashboardRun, DashboardTurnGroup } from "../api/types";
import { RunExplorer } from "../run-explorer/RunExplorer";
import { TurnList } from "../run-explorer/TurnList";
import { defaultViewState, type DashboardViewState } from "../state/view-state";
import { apiRealFixtures } from "../../test/helpers/contract-fixtures";

describe("turn drilldown dashboard", () => {
  it("renders turns as the top-level center pane", () => {
    renderExplorer({ run: turnRun() });

    const turnList = screen.getByLabelText("Turns");
    const rows = within(turnList).getAllByLabelText(/Turn \d+/);
    expect(rows).toHaveLength(2);
    expect(within(rows[0]!).getByRole("heading", { name: "Refactor capture flow" })).toBeInTheDocument();
    expect(within(rows[1]!).getByRole("heading", { name: "Requests without turn identity" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Requests")).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("expands a turn into request rows", async () => {
    const user = userEvent.setup();
    let state: DashboardViewState = { ...defaultViewState };
    const onChangeViewState = vi.fn((next: Partial<DashboardViewState>) => {
      state = { ...state, ...next };
    });
    const { rerender } = renderExplorer({ run: turnRun(), viewState: state, onChangeViewState });

    await user.click(screen.getAllByRole("button", { name: "Expand requests" })[0]!);

    expect(onChangeViewState).toHaveBeenCalledWith({ expandedTurnIds: ["turn-alpha"] });
    rerender(renderExplorerElement({ ...state, expandedTurnIds: ["turn-alpha"] }, onChangeViewState, { run: turnRun() }));

    const firstTurn = screen.getAllByLabelText(/Turn \d+/)[0]!;
    expect(within(firstTurn).getByRole("heading", { name: "Wiring turn identity through recording" })).toBeInTheDocument();
    expect(within(firstTurn).getByRole("heading", { name: "Apply patch to recording" })).toBeInTheDocument();
  });

  it("uses API-provided assistant-preview request titles", () => {
    renderExplorer({ run: turnRun(), viewState: { ...defaultViewState, expandedTurnIds: ["turn-alpha"] } });

    const firstTurn = screen.getAllByLabelText(/Turn \d+/)[0]!;
    expect(within(firstTurn).getByRole("heading", { name: "Wiring turn identity through recording" })).toBeInTheDocument();
    expect(within(firstTurn).queryByText("Assistant preview")).not.toBeInTheDocument();
    expect(within(firstTurn).queryByRole("heading", { name: "req-alpha-1" })).not.toBeInTheDocument();
  });

  it("expands request artifacts under a turn", async () => {
    const user = userEvent.setup();
    const onChangeViewState = vi.fn();
    renderExplorer({
      run: turnRun(),
      viewState: { ...defaultViewState, expandedTurnIds: ["turn-alpha"] },
      onChangeViewState
    });

    await user.click(screen.getAllByRole("button", { name: "Expand artifacts" })[0]!);

    expect(onChangeViewState).toHaveBeenCalledWith({ expandedRequestIds: ["req-alpha-1"] });
  });

  it("opens artifact detail from a nested request inclusion", async () => {
    const user = userEvent.setup();
    const onChangeViewState = vi.fn();
    renderExplorer({
      run: turnRun(),
      viewState: {
        ...defaultViewState,
        expandedTurnIds: ["turn-alpha"],
        expandedRequestIds: ["req-alpha-1"]
      },
      onChangeViewState
    });

    expect(screen.getByLabelText("Request artifacts")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Expand artifact" }));

    expect(onChangeViewState).toHaveBeenCalledWith({
      expandedArtifactIds: ["PATCH:alpha"],
      selectedArtifactId: "PATCH:alpha"
    });
  });

  it("does not collapse the request when interacting with expanded artifact detail", async () => {
    const user = userEvent.setup();
    const onChangeViewState = vi.fn();
    renderExplorer({
      run: turnRun(),
      viewState: {
        ...defaultViewState,
        expandedTurnIds: ["turn-alpha"],
        expandedRequestIds: ["req-alpha-1"],
        expandedArtifactIds: ["PATCH:alpha"],
        selectedArtifactId: "PATCH:alpha"
      },
      details: {
        "PATCH:alpha": {
          schema_version: 1,
          generated_at: "2026-06-29T12:00:00.000Z",
          caveats: [],
          data: {
            ...apiRealFixtures.artifactDetail.data,
            artifact_id: "PATCH:alpha",
            title: "apply_patch: recording.ts"
          }
        }
      },
      onChangeViewState
    });

    await user.click(screen.getByLabelText("Artifact detail"));

    expect(onChangeViewState).not.toHaveBeenCalledWith({ expandedRequestIds: [] });
  });

  it("keeps multiple artifact details expanded under the same request", () => {
    const run = multiArtifactRun();
    renderExplorer({
      run,
      viewState: {
        ...defaultViewState,
        expandedTurnIds: ["turn-alpha"],
        expandedRequestIds: ["req-alpha-1"],
        expandedArtifactIds: ["PATCH:alpha", "OUT:alpha"],
        selectedArtifactId: "OUT:alpha"
      },
      details: {
        "PATCH:alpha": {
          schema_version: 1,
          generated_at: "2026-06-29T12:00:00.000Z",
          caveats: [],
          data: {
            ...apiRealFixtures.artifactDetail.data,
            artifact_id: "PATCH:alpha",
            title: "apply_patch: recording.ts"
          }
        },
        "OUT:alpha": {
          schema_version: 1,
          generated_at: "2026-06-29T12:00:00.000Z",
          caveats: [],
          data: {
            ...apiRealFixtures.artifactDetail.data,
            artifact_id: "OUT:alpha",
            title: "exec_command output"
          }
        }
      }
    });

    expect(screen.getAllByLabelText("Artifact detail")).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "apply_patch: recording.ts" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "exec_command output" })).toBeInTheDocument();
  });

  it("collapses one artifact without clearing other expanded artifacts", async () => {
    const user = userEvent.setup();
    const onChangeViewState = vi.fn();
    renderExplorer({
      run: multiArtifactRun(),
      viewState: {
        ...defaultViewState,
        expandedTurnIds: ["turn-alpha"],
        expandedRequestIds: ["req-alpha-1"],
        expandedArtifactIds: ["PATCH:alpha", "OUT:alpha"],
        selectedArtifactId: "PATCH:alpha"
      },
      onChangeViewState
    });

    await user.click(screen.getAllByRole("button", { name: "Collapse artifact" })[0]!);

    expect(onChangeViewState).toHaveBeenCalledWith({
      expandedArtifactIds: ["OUT:alpha"],
      selectedArtifactId: undefined
    });
  });

  it("labels missing-turn fallback groups", () => {
    renderExplorer({ run: turnRun() });

    const fallback = screen.getAllByLabelText(/Turn \d+/)[1]!;
    expect(within(fallback).getByRole("heading", { name: "Requests without turn identity" })).toBeInTheDocument();
    expect(within(fallback).getByText("Missing turn identity")).toBeInTheDocument();
  });

  it("renders unsupported and empty turn states explicitly", () => {
    render(
      <TurnList
        artifactRows={[]}
        expandedRequestIds={[]}
        expandedArtifactIds={[]}
        expandedTurnIds={[]}
        requestSortDirection="asc"
        requestSortKey="time"
        turns={[]}
        onChangeRequestSort={() => undefined}
        onToggleArtifact={() => undefined}
        onToggleRequest={() => undefined}
        onToggleTurn={() => undefined}
      />
    );
    expect(screen.getByText("No turns")).toBeInTheDocument();
  });

  it("renders turn totals and the first request time", () => {
    renderExplorer({ run: turnRun() });

    const firstTurn = screen.getAllByLabelText(/Turn \d+/)[0]!;
    expect(within(firstTurn).getByText("Total Tokens")).toBeInTheDocument();
    expect(within(firstTurn).getByText("Requests")).toBeInTheDocument();
    expect(within(firstTurn).getByText(/6\/29\/2026/)).toBeInTheDocument();
  });

  it("renders top normalized artifact contributors in the overview", async () => {
    const user = userEvent.setup();
    const onChangeViewState = vi.fn();
    renderExplorer({ run: contributorRun(), onChangeViewState });

    expect(screen.getByLabelText("Top artifact contributors by normalized token contribution")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Top 5 Artifact Contributors" })).toBeInTheDocument();
    expect(screen.getByText("apply_patch: feature.ts")).toBeInTheDocument();
    expect(screen.getByText("exec_command output")).toBeInTheDocument();
    expect(screen.queryByText("hidden small contributor")).not.toBeInTheDocument();
    expect(screen.queryByText("1,000 attributed")).not.toBeInTheDocument();
    expect(screen.getByText("4 occurrences · 500 Tokens")).toBeInTheDocument();
    expect(screen.getByText("2 occurrences · 250 Tokens")).toBeInTheDocument();
    const fills = document.querySelectorAll<HTMLElement>(".contributor-bar-fill");
    expect(fills).toHaveLength(5);
    expect(fills[0]?.style.width).toBe("50%");
    expect(fills[1]?.style.width).toBe("25%");
    expect(fills[2]?.style.width).toBe("15%");
    expect(fills[3]?.style.width).toBe("6%");
    expect(fills[4]?.style.width).toBe("3%");

    await user.click(screen.getByRole("button", { name: "apply_patch: feature.ts" }));

    expect(onChangeViewState).toHaveBeenCalledWith({
      expandedTurnIds: ["turn-alpha"],
      expandedRequestIds: ["req-alpha-1"],
      expandedArtifactIds: ["PATCH:alpha"],
      selectedArtifactId: "PATCH:alpha"
    });
  });

  it("truncates long turn preview titles at 100 characters", () => {
    const run = turnRun();
    const longTitle = `${"A".repeat(205)} trailing text`;
    run.turns[0] = {
      ...run.turns[0]!,
      display_title: longTitle,
      requests: [{
        ...run.turns[0]!.requests[0]!,
        display_title: longTitle
      }]
    };

    renderExplorer({ run, viewState: { ...defaultViewState, expandedTurnIds: ["turn-alpha"] } });

    const expected = `${"A".repeat(100)}...`;
    expect(screen.getByRole("heading", { name: expected })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: longTitle })).toBeInTheDocument();
  });

  it("sorts turns by selected category and direction", async () => {
    const user = userEvent.setup();
    const onChangeViewState = vi.fn();
    const { rerender } = renderExplorer({
      run: turnRun(),
      viewState: { ...defaultViewState, expandedTurnIds: ["turn-alpha"] },
      onChangeViewState
    });

    await user.selectOptions(screen.getByLabelText("Direction"), "desc");
    expect(onChangeViewState).toHaveBeenCalledWith({ requestSortKey: "time", requestSortDirection: "desc" });

    rerender(renderExplorerElement(
      { ...defaultViewState, expandedTurnIds: ["turn-alpha"], requestSortDirection: "desc" },
      onChangeViewState,
      { run: turnRun() }
    ));

    const turnRows = screen.getAllByLabelText(/Turn \d+/);
    expect(within(turnRows[0]!).getByRole("heading", { name: "Requests without turn identity" })).toBeInTheDocument();
    expect(within(turnRows[1]!).getByRole("heading", { name: "Refactor capture flow" })).toBeInTheDocument();
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
      run={turnRun()}
      viewState={viewState}
      onChangeViewState={onChangeViewState}
      {...overrides}
    />
  );
}

function turnRun(): DashboardRun {
  const base = apiRealFixtures.run.data;
  const firstRequest = base.requests.rows[0]!;
  const firstInclusion = firstRequest.artifact_inclusions[0]!;
  const artifactId = "PATCH:alpha";
  const artifactInclusion = {
    ...firstInclusion,
    artifact_id: artifactId,
    display_name: "apply_patch: recording.ts",
    display_category: "patch",
    request_order: 0
  };
  const alphaRequests: DashboardTurnGroup["requests"] = [
    {
      request_id: "req-alpha-1",
      timestamp: "2026-06-29T12:00:00.000Z",
      display_title: "Wiring turn identity through recording",
      title_source: "assistant_preview",
      chronology_index: 0,
      availability: firstRequest.availability,
      usage: firstRequest.usage,
      artifact_inclusions: [artifactInclusion],
      caveats: []
    },
    {
      request_id: "req-alpha-2",
      timestamp: "2026-06-29T12:05:00.000Z",
      display_title: "Apply patch to recording",
      title_source: "action_label",
      chronology_index: 1,
      availability: firstRequest.availability,
      usage: firstRequest.usage ? {
        ...firstRequest.usage,
        uncached_input_tokens: firstRequest.usage.uncached_input_tokens + 10,
        output_tokens: firstRequest.usage.output_tokens + 10,
        total_tokens: firstRequest.usage.total_tokens + 20
      } : undefined,
      artifact_inclusions: [],
      caveats: []
    }
  ];
  const turns: DashboardTurnGroup[] = [
    {
      turn_id: "turn-alpha",
      display_title: "Refactor capture flow",
      title_source: "user_preview",
      grouping_source: "direct_turn_id",
      confidence: "complete",
      request_ids: alphaRequests.map((request) => request.request_id),
      artifact_ids: [artifactId],
      requests: alphaRequests,
      metrics: {
        input_tokens: 138978,
        cached_input_tokens: 424832,
        uncached_input_tokens: 138978,
        output_tokens: 1076,
        total_tokens: 564886,
        total_local_artifact_tokens: 1642,
        artifact_count: 1
      },
      privacy: base.privacy,
      caveats: []
    },
    {
      turn_id: "turn:fallback:missing",
      display_title: "Requests without turn identity",
      title_source: "fallback",
      grouping_source: "missing_turn_id",
      confidence: "fallback",
      request_ids: ["req-missing"],
      artifact_ids: [],
      requests: [{
        request_id: "req-missing",
        timestamp: "2026-06-29T12:10:00.000Z",
        display_title: "Requests without turn identity",
        title_source: "turn_title",
        chronology_index: 2,
        availability: firstRequest.availability,
        artifact_inclusions: [],
        caveats: []
      }],
      metrics: {
        total_local_artifact_tokens: 0,
        artifact_count: 0
      },
      privacy: {
        ...base.privacy,
        hidden_fields: ["prompt", ...base.privacy.hidden_fields]
      },
      caveats: [{
        code: "turn_identity_missing",
        severity: "info",
        message: "Request has no canonical turn identity."
      }]
    }
  ];

  return {
    ...base,
    artifacts: [{
      ...base.artifacts[0]!,
      artifact_id: artifactId,
      display_name: "apply_patch: recording.ts",
      display_category: "patch",
      detail_available: true
    }],
    artifact_details: {
      [artifactId]: {
        ...base.artifact_details[firstInclusion.artifact_id]!,
        artifact_id: artifactId,
        title: "apply_patch: recording.ts"
      }
    },
    requests: {
      ...base.requests,
      rows: alphaRequests.map((request, index) => ({
        ...firstRequest,
        request_id: request.request_id,
        chronology_index: index,
        artifact_inclusions: request.artifact_inclusions,
        artifact_count: request.artifact_inclusions.length
      }))
    },
    turns
  };
}

function contributorRun(): DashboardRun {
  const base = turnRun();
  return {
    ...base,
    overview: {
      ...base.overview,
      input_tokens: 1000,
      cached_input_tokens: 300,
      uncached_input_tokens: 700
    },
    artifacts: [
      {
        ...base.artifacts[0]!,
        artifact_id: "PATCH:alpha",
        display_name: "apply_patch: feature.ts",
        display_category: "patch",
        total_exposure: 1200,
        repeated_exposure: 400,
        inclusion_count: 4,
        normalized_estimated_input_tokens: 500,
        estimated_cached_input_tokens: 100,
        estimated_uncached_input_tokens: 400
      },
      {
        ...base.artifacts[0]!,
        artifact_id: "artifact-tool-output-1",
        display_name: "exec_command output",
        display_category: "tool_output",
        total_exposure: 500,
        repeated_exposure: 125,
        inclusion_count: 2,
        normalized_estimated_input_tokens: 250,
        estimated_cached_input_tokens: 50,
        estimated_uncached_input_tokens: 200
      },
      {
        ...base.artifacts[0]!,
        artifact_id: "artifact-note-1",
        display_name: "session note",
        display_category: "note",
        total_exposure: 150,
        repeated_exposure: 0,
        inclusion_count: 1,
        normalized_estimated_input_tokens: 150,
        estimated_cached_input_tokens: 0,
        estimated_uncached_input_tokens: 150
      },
      {
        ...base.artifacts[0]!,
        artifact_id: "artifact-command-1",
        display_name: "shell command",
        display_category: "command",
        total_exposure: 60,
        repeated_exposure: 0,
        inclusion_count: 1,
        normalized_estimated_input_tokens: 60,
        estimated_cached_input_tokens: 0,
        estimated_uncached_input_tokens: 60
      },
      {
        ...base.artifacts[0]!,
        artifact_id: "artifact-file-1",
        display_name: "file context",
        display_category: "file_context",
        total_exposure: 30,
        repeated_exposure: 0,
        inclusion_count: 1,
        normalized_estimated_input_tokens: 30,
        estimated_cached_input_tokens: 0,
        estimated_uncached_input_tokens: 30
      },
      {
        ...base.artifacts[0]!,
        artifact_id: "artifact-hidden-small-1",
        display_name: "hidden small contributor",
        display_category: "request_metadata",
        total_exposure: 10,
        repeated_exposure: 0,
        inclusion_count: 1,
        normalized_estimated_input_tokens: 10,
        estimated_cached_input_tokens: 0,
        estimated_uncached_input_tokens: 10
      }
    ]
  };
}

function multiArtifactRun(): DashboardRun {
  const run = turnRun();
  const secondArtifactId = "OUT:alpha";
  const firstRequest = run.turns[0]!.requests[0]!;
  const secondInclusion = {
    ...firstRequest.artifact_inclusions[0]!,
    artifact_id: secondArtifactId,
    display_name: "exec_command output",
    display_category: "command_output",
    request_order: 1
  };

  return {
    ...run,
    artifacts: [
      ...run.artifacts,
      {
        ...run.artifacts[0]!,
        artifact_id: secondArtifactId,
        display_name: "exec_command output",
        display_category: "command_output",
        detail_available: true
      }
    ],
    turns: [
      {
        ...run.turns[0]!,
        requests: [
          {
            ...firstRequest,
            artifact_inclusions: [...firstRequest.artifact_inclusions, secondInclusion]
          },
          ...run.turns[0]!.requests.slice(1)
        ]
      },
      ...run.turns.slice(1)
    ]
  };
}
