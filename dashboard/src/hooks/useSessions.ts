import { useCallback, useEffect, useState } from "react";
import type { DashboardClientError } from "../api/errors";
import type { DashboardApiClient } from "../api/client";
import type { SessionsResponse } from "../api/types";

export function useSessions(client: DashboardApiClient, enabled: boolean) {
  const [data, setData] = useState<SessionsResponse>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<DashboardClientError>();

  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(undefined);
    try {
      setData(await client.getSessions(20));
    } catch (caught) {
      setError(caught as DashboardClientError);
    } finally {
      setLoading(false);
    }
  }, [client, enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, reload };
}
