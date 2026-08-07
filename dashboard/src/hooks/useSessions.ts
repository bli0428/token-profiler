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

  const loadMore = useCallback(async () => {
    const cursor = data?.data.next_cursor;
    if (!enabled || !cursor) return;
    setLoading(true);
    try {
      const next = await client.getSessions(20, cursor);
      setData((current) => current ? { ...next, data: { ...next.data, sessions: [...current.data.sessions, ...next.data.sessions] } } : next);
    } catch (caught) { setError(caught as DashboardClientError); } finally { setLoading(false); }
  }, [client, data, enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, reload, loadMore };
}
