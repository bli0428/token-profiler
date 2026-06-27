import { useCallback, useEffect, useState } from "react";
import type { DashboardClientError } from "../api/errors";
import type { DashboardApiClient } from "../api/client";
import type { ArtifactDetailResponse } from "../api/types";

export function useArtifactDetail(client: DashboardApiClient, runId: string | undefined, artifactId: string | undefined) {
  const [data, setData] = useState<ArtifactDetailResponse>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<DashboardClientError>();

  const reload = useCallback(async () => {
    if (!runId || !artifactId) {
      setData(undefined);
      return;
    }
    setLoading(true);
    setError(undefined);
    try {
      setData(await client.getArtifactDetail(runId, artifactId));
    } catch (caught) {
      setError(caught as DashboardClientError);
    } finally {
      setLoading(false);
    }
  }, [artifactId, client, runId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, reload };
}
