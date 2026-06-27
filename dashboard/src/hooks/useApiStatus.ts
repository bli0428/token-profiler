import { useCallback, useEffect, useState } from "react";
import type { DashboardClientError } from "../api/errors";
import type { DashboardApiClient } from "../api/client";
import type { StatusResponse } from "../api/types";

export type AsyncStatus<T> = {
  data?: T;
  loading: boolean;
  error?: DashboardClientError;
  reload: () => Promise<void>;
};

export function useApiStatus(client: DashboardApiClient): AsyncStatus<StatusResponse> {
  const [data, setData] = useState<StatusResponse>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<DashboardClientError>();

  const reload = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      setData(await client.getStatus());
    } catch (caught) {
      setError(caught as DashboardClientError);
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, reload };
}
