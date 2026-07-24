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
      }))
      .mockResolvedValueOnce(envelope({
        run_id: "run-large",
        mode: "paged" as const,
        overview: overview(),
        request_page: { items: [request("old")] }
      }));

    const client = { baseUrl: "", getLargeRun } as unknown as DashboardApiClient;
    render(<LargeRunExplorer client={client} runId="run-large" />);

    expect(await screen.findByText("new")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next requests" }));
    expect(await screen.findByText("old")).toBeInTheDocument();
    expect(getLargeRun).toHaveBeenLastCalledWith("run-large", "next");
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

function envelope<T>(data: T) {
  return { schema_version: 1 as const, generated_at: "2026-07-24T00:00:00.000Z", data, caveats: [] };
}
