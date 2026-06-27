import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArtifactDetailPanel } from "../run-explorer/ArtifactDetailPanel";
import { hiddenArtifactDetailFixture, metadataOnlyArtifactDetailFixture } from "../../test/fixtures/edge-fixtures";

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
});
