import { useCallback, useEffect, useState } from "react";
import type { DashboardClientError } from "../api/errors";
import type { DashboardApiClient } from "../api/client";
import type { RunResponse } from "../api/types";

export function useSelectedRun(client: DashboardApiClient, runId: string | undefined, enabled = true) {
  const [data, setData] = useState<RunResponse>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<DashboardClientError>();

  const reload = useCallback(async () => {
    if (!enabled || !runId) {
      setData(undefined);
      setError(undefined);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(undefined);
    try {
      setData(await client.getRun(runId));
    } catch (caught) {
      setError(caught as DashboardClientError);
    } finally {
      setLoading(false);
    }
  }, [client, enabled, runId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, reload };
}
