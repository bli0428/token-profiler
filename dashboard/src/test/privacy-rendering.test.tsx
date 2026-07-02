import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArtifactDetailPanel } from "../run-explorer/ArtifactDetailPanel";
import { RequestArtifacts } from "../run-explorer/RequestArtifacts";
import { hiddenArtifactDetailFixture, metadataOnlyArtifactDetailFixture } from "../../test/fixtures/edge-fixtures";
import { apiRealFixtures } from "../../test/helpers/contract-fixtures";

describe("privacy rendering", () => {
  it("does not render raw content for metadata-only detail", () => {
    render(<ArtifactDetailPanel detail={metadataOnlyArtifactDetailFixture.data} loading={false} />);
    expect(screen.queryByText("Hidden")).not.toBeInTheDocument();
    expect(screen.queryByText(/raw prompt|command output|patch|file content|message body/i)).not.toBeInTheDocument();
  });

  it("keeps hidden content visually distinct", () => {
    render(<ArtifactDetailPanel detail={hiddenArtifactDetailFixture.data} loading={false} />);
    expect(screen.queryByText("Hidden")).not.toBeInTheDocument();
    expect(screen.queryByText(/hidden by the active privacy policy/i)).not.toBeInTheDocument();
  });

  it("renders the richest content already available on artifact detail", () => {
    const detail = {
      ...apiRealFixtures.artifactDetail.data,
      privacy: {
        ...apiRealFixtures.artifactDetail.data.privacy,
        storage_mode: "raw",
        raw_content_available: true,
        preview_fields: ["preview"],
        hidden_fields: []
      },
      content: {
        preview: "PREVIEW_TEXT",
        raw: "RAW_SECRET_TEXT",
        raw_reveal_required: true
      }
    };

    render(<ArtifactDetailPanel detail={detail} loading={false} />);
    expect(screen.getByText("RAW_SECRET_TEXT")).toBeInTheDocument();
    expect(screen.queryByText("PREVIEW_TEXT")).not.toBeInTheDocument();
  });

  it("renders request artifacts without hidden raw content", () => {
    const request = apiRealFixtures.run.data.requests.rows[0]!;
    render(
      <RequestArtifacts
        artifacts={request.artifact_inclusions}
        artifactRows={apiRealFixtures.run.data.artifacts}
        requestId={request.request_id}
        expandedArtifactIds={[]}
        onToggleArtifact={() => undefined}
      />
    );

    expect(screen.queryByText("Hidden")).not.toBeInTheDocument();
    expect(screen.queryByText(request.artifact_inclusions[0]!.stable_short_id)).not.toBeInTheDocument();
    expect(screen.getAllByText("Tokens").length).toBeGreaterThan(0);
    expect(screen.queryByText("Local Tokens")).not.toBeInTheDocument();
    expect(screen.queryByText("Attribution")).not.toBeInTheDocument();
    expect(screen.queryByText(/raw prompt|command output|patch|file content|message body/i)).not.toBeInTheDocument();
  });

  it("does not render reasoning state as an artifact token total", () => {
    render(
      <RequestArtifacts
        artifacts={[{
          artifact_id: "SUMMARY:input:reasoning:3",
          stable_short_id: "reason3",
          artifact_type: "SUMMARY",
          display_name: "Reasoning state",
          display_category: "reasoning_state",
          request_order: 3,
          local_token_count: 801,
          estimated_cached_input_tokens: 801,
          estimated_uncached_input_tokens: 0,
          attribution_state: "estimated",
          privacy: apiRealFixtures.run.data.privacy,
          caveats: []
        }]}
        requestId="req-reasoning"
        expandedArtifactIds={[]}
        artifactRows={[{
          artifact_id: "SUMMARY:input:reasoning:3",
          stable_short_id: "reason3",
          display_name: "Reasoning state",
          display_category: "reasoning_state",
          task_group_ids: [],
          total_exposure: 1,
          unique_exposure: 1,
          repeated_exposure: 0,
          inclusion_count: 1,
          preview_state: "hidden",
          detail_available: false,
          search_text: "Reasoning state",
          caveats: []
        }]}
        onToggleArtifact={() => undefined}
      />
    );

    expect(screen.getByRole("heading", { name: "Reasoning state" })).toBeInTheDocument();
    expect(screen.getByText("Reasoning state", { selector: "p" })).toBeInTheDocument();
    expect(screen.queryByText("Tokens")).not.toBeInTheDocument();
    expect(screen.queryByText("801")).not.toBeInTheDocument();
  });
});
