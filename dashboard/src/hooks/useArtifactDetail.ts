import { useCallback, useEffect, useState } from "react";
import type { DashboardClientError } from "../api/errors";
import type { DashboardApiClient } from "../api/client";
import type { ArtifactDetailResponse } from "../api/types";

export function useArtifactDetails(client: DashboardApiClient, runId: string | undefined, artifactIds: string[]) {
  const [data, setData] = useState<Record<string, ArtifactDetailResponse>>({});
  const [loadingIds, setLoadingIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, DashboardClientError>>({});

  const reload = useCallback(async () => {
    const uniqueIds = Array.from(new Set(artifactIds));
    if (!runId || uniqueIds.length === 0) {
      setData({});
      setLoadingIds([]);
      setErrors({});
      return;
    }

    setLoadingIds(uniqueIds);
    setErrors({});
    const entries = await Promise.all(uniqueIds.map(async (artifactId) => {
      try {
        return [artifactId, await client.getArtifactDetail(runId, artifactId), undefined] as const;
      } catch (caught) {
        return [artifactId, undefined, caught as DashboardClientError] as const;
      }
    }));

    setData(Object.fromEntries(entries.flatMap(([artifactId, response]) => response ? [[artifactId, response]] : [])));
    setErrors(Object.fromEntries(entries.flatMap(([artifactId, , error]) => error ? [[artifactId, error]] : [])));
    setLoadingIds([]);
  }, [artifactIds, client, runId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loadingIds, errors, reload };
}
