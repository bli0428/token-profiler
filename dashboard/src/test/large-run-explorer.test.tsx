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
    fireEvent.click(screen.getByRole("button", { name: "Artifacts" }));
    expect(await screen.findByText(/one\.ts/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next artifacts" }));
    expect(await screen.findByText(/two\.ts/)).toBeInTheDocument();
    expect(getLargeRunArtifacts).toHaveBeenLastCalledWith("run-large", "selected", "next-artifacts");
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

function request(request_id: string) {
  return { request_id, chronology_index: 0, artifact_count: 0, total_local_artifact_tokens: 0 };
}

function artifact(artifact_id: string, preview_state: "hidden" | "preview") {
  return { artifact_id, artifact_type: "FILE", display_name: `${artifact_id}.ts`, local_token_count: 1, request_order: 0, preview_state };
}

function envelope<T>(data: T) {
  return { schema_version: 1 as const, generated_at: "2026-07-24T00:00:00.000Z", data, caveats: [] };
}
