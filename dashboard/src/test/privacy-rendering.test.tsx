import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArtifactDetailPanel } from "../run-explorer/ArtifactDetailPanel";
import { RequestArtifacts } from "../run-explorer/RequestArtifacts";
import { hiddenArtifactDetailFixture, metadataOnlyArtifactDetailFixture } from "../../test/fixtures/edge-fixtures";
import { apiRealFixtures } from "../../test/helpers/contract-fixtures";

describe("privacy rendering", () => {
  it("does not render raw content for metadata-only detail", () => {
    render(<ArtifactDetailPanel detail={metadataOnlyArtifactDetailFixture.data} loading={false} />);
    expect(screen.getByText("Hidden")).toBeInTheDocument();
    expect(screen.queryByText(/raw prompt|command output|patch|file content|message body/i)).not.toBeInTheDocument();
  });

  it("keeps hidden content visually distinct", () => {
    render(<ArtifactDetailPanel detail={hiddenArtifactDetailFixture.data} loading={false} />);
    expect(screen.getByText("Hidden")).toBeInTheDocument();
    expect(screen.getByText(/hidden by the active privacy policy/i)).toBeInTheDocument();
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
        onSelectArtifact={() => undefined}
      />
    );

    expect(screen.getAllByText("Hidden").length).toBeGreaterThan(0);
    expect(screen.queryByText(/raw prompt|command output|patch|file content|message body/i)).not.toBeInTheDocument();
  });
});
