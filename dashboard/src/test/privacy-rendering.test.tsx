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
