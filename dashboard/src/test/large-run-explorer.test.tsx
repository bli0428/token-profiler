import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DashboardApiClient } from "../api/client";
import { LargeRunExplorer } from "../run-explorer/LargeRunExplorer";

describe("large run explorer", () => {
  it("renders a bounded request page and loads its next cursor", async () => {
    const getLargeRun = vi
      .fn()
      .mockResolvedValueOnce(envelope({
        run_id: "run-large",
        mode: "paged" as const,
        overview: overview(),
        request_page: { items: [request("new")], next_cursor: "next" }
      }));
    const getLargeRunRequests = vi
      .fn()
      .mockResolvedValueOnce(envelope({
        items: [request("old")]
      }));

    const client = { baseUrl: "", getLargeRun, getLargeRunRequests } as unknown as DashboardApiClient;
    render(<LargeRunExplorer client={client} runId="run-large" />);

    expect(await screen.findByText("new")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next requests" }));
    expect(await screen.findByText("old")).toBeInTheDocument();
    expect(getLargeRunRequests).toHaveBeenLastCalledWith("run-large", "next");
  });

  it("pages artifacts for the selected request with the returned cursor", async () => {
    const getLargeRun = vi.fn().mockResolvedValueOnce(envelope({
      run_id: "run-large", mode: "paged" as const, overview: overview(), request_page: { items: [request("selected")] }
    }));
    const getLargeRunArtifacts = vi.fn()
      .mockResolvedValueOnce(envelope({ request_id: "selected", items: [artifact("one", "hidden")], next_cursor: "next-artifacts" }))
      .mockResolvedValueOnce(envelope({ request_id: "selected", items: [artifact("two", "preview")] }));
    const client = { baseUrl: "", getLargeRun, getLargeRunArtifacts } as unknown as DashboardApiClient;

    render(<LargeRunExplorer client={client} runId="run-large" />);
    await screen.findByText("selected");
    fireEvent.click(screen.getByRole("button", { name: "Artifacts for selected" }));
    expect(await screen.findByText(/one\.ts/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next artifacts" }));
    expect(await screen.findByText(/two\.ts/)).toBeInTheDocument();
    expect(getLargeRunArtifacts).toHaveBeenLastCalledWith("run-large", "selected", "next-artifacts");
  });

  it("resets a selected artifact page when the selected run changes", async () => {
    const getLargeRun = vi.fn()
      .mockResolvedValueOnce(envelope(largeRun("run-one", [request("selected")])))
      .mockResolvedValueOnce(envelope(largeRun("run-two", [request("other")])))
    ;
    const getLargeRunArtifacts = vi.fn().mockResolvedValue(envelope(artifactPage("selected", [artifact("one", "hidden")])))
    const client = { baseUrl: "", getLargeRun, getLargeRunArtifacts } as unknown as DashboardApiClient;
    const view = render(<LargeRunExplorer client={client} runId="run-one" />);

    fireEvent.click(await screen.findByRole("button", { name: "Artifacts for selected" }));
    expect(await screen.findByText(/one\.ts/)).toBeInTheDocument();

    view.rerender(<LargeRunExplorer client={client} runId="run-two" />);
    expect(await screen.findByText("other")).toBeInTheDocument();
    expect(screen.queryByText(/one\.ts/)).not.toBeInTheDocument();
  });

  it("shows a safe error when an artifact page cannot be loaded", async () => {
    const getLargeRun = vi.fn().mockResolvedValue(envelope(largeRun("run-large", [request("selected")])))
    const getLargeRunArtifacts = vi.fn().mockRejectedValue(new Error("Unable to read artifact page"));
    const client = { baseUrl: "", getLargeRun, getLargeRunArtifacts } as unknown as DashboardApiClient;
    render(<LargeRunExplorer client={client} runId="run-large" />);

    fireEvent.click(await screen.findByRole("button", { name: "Artifacts for selected" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to read artifact page");
  });
});

function overview() {
  return {
    request_count: 2,
    artifact_count: 1,
    event_count: 3,
    event_file_bytes: 70 * 1024 * 1024,
    input_tokens: 100,
    cached_input_tokens: 50,
    uncached_input_tokens: 50,
    output_tokens: 10
  };
}

function largeRun(run_id: string, items: ReturnType<typeof request>[]) {
  return { run_id, mode: "paged" as const, overview: overview(), request_page: { items } };
}

function request(request_id: string) {
  return { request_id, chronology_index: 0, artifact_count: 0, total_local_artifact_tokens: 0 };
}

function artifact(artifact_id: string, preview_state: "hidden" | "preview") {
  return { artifact_id, artifact_type: "FILE", display_name: `${artifact_id}.ts`, local_token_count: 1, request_order: 0, preview_state };
}

function artifactPage(request_id: string, items: ReturnType<typeof artifact>[]) {
  return { request_id, items };
}

function envelope<T>(data: T) {
  return { schema_version: 1 as const, generated_at: "2026-07-24T00:00:00.000Z", data, caveats: [] };
}
