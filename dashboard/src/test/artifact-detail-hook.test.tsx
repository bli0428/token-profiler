import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DashboardApiClient } from "../api/client";
import type { ArtifactDetailResponse } from "../api/types";
import { useArtifactDetails } from "../hooks/useArtifactDetail";
import { apiRealFixtures } from "../../test/helpers/contract-fixtures";

describe("useArtifactDetails", () => {
  it("keeps loaded artifact detail visible while loading a newly expanded artifact", async () => {
    const firstDetail = deferred<ArtifactDetailResponse>();
    const secondDetail = deferred<ArtifactDetailResponse>();
    const getArtifactDetail = vi.fn(async (_runId: string, artifactId: string) => {
      if (artifactId === "PATCH:alpha") return firstDetail.promise;
      if (artifactId === "OUT:alpha") return secondDetail.promise;
      throw new Error(`Unexpected artifact id: ${artifactId}`);
    });
    const client = testClient(getArtifactDetail);

    const { rerender } = render(<Harness artifactIds={["PATCH:alpha"]} client={client} />);

    expect(screen.getByLabelText("loading")).toHaveTextContent("PATCH:alpha");
    expect(screen.getByLabelText("loaded")).toBeEmptyDOMElement();

    await act(async () => {
      firstDetail.resolve(detailResponse("PATCH:alpha"));
    });

    await waitFor(() => expect(screen.getByLabelText("loaded")).toHaveTextContent("PATCH:alpha"));
    expect(screen.getByLabelText("loading")).toBeEmptyDOMElement();

    rerender(<Harness artifactIds={["PATCH:alpha", "OUT:alpha"]} client={client} />);

    await waitFor(() => expect(screen.getByLabelText("loading")).toHaveTextContent("OUT:alpha"));
    expect(screen.getByLabelText("loading")).not.toHaveTextContent("PATCH:alpha");
    expect(screen.getByLabelText("loaded")).toHaveTextContent("PATCH:alpha");
    expect(getArtifactDetail).toHaveBeenCalledTimes(2);
    expect(getArtifactDetail.mock.calls.map(([, artifactId]) => artifactId)).toEqual(["PATCH:alpha", "OUT:alpha"]);

    await act(async () => {
      secondDetail.resolve(detailResponse("OUT:alpha"));
    });

    await waitFor(() => expect(screen.getByLabelText("loaded")).toHaveTextContent("PATCH:alpha,OUT:alpha"));
    expect(screen.getByLabelText("loading")).toBeEmptyDOMElement();
  });

  it("does not reuse artifact detail cached for a different run", async () => {
    const getArtifactDetail = vi.fn(async (runId: string, artifactId: string) => detailResponse(`${runId}:${artifactId}`));
    const client = testClient(getArtifactDetail);

    const { rerender } = render(<Harness artifactIds={["PATCH:alpha"]} client={client} runId="run-alpha" />);

    await waitFor(() => expect(screen.getByLabelText("loaded")).toHaveTextContent("PATCH:alpha"));

    rerender(<Harness artifactIds={["PATCH:alpha"]} client={client} runId="run-beta" />);

    await waitFor(() => expect(getArtifactDetail).toHaveBeenCalledTimes(2));
    expect(getArtifactDetail.mock.calls.map(([runId]) => runId)).toEqual(["run-alpha", "run-beta"]);
  });
});

function Harness({ artifactIds, client, runId = "run-alpha" }: { artifactIds: string[]; client: DashboardApiClient; runId?: string }) {
  const details = useArtifactDetails(client, runId, artifactIds);
  return (
    <div>
      <span aria-label="loading">{details.loadingIds.join(",")}</span>
      <span aria-label="loaded">{Object.keys(details.data).join(",")}</span>
    </div>
  );
}

function detailResponse(artifactId: string): ArtifactDetailResponse {
  return {
    ...apiRealFixtures.artifactDetail,
    data: {
      ...apiRealFixtures.artifactDetail.data,
      artifact_id: artifactId
    }
  };
}

function testClient(getArtifactDetail: DashboardApiClient["getArtifactDetail"]): DashboardApiClient {
  return {
    baseUrl: "",
    getStatus: async () => apiRealFixtures.status,
    getSessions: async () => apiRealFixtures.sessions,
    getRun: async () => apiRealFixtures.run,
    getArtifactDetail
  };
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}
