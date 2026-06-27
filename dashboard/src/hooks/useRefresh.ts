import { useCallback, useEffect, useState } from "react";
import type { RefreshResult } from "../state/reconcile";

export function useRefresh(refresh: () => Promise<RefreshResult>, mode: "manual" | "interval") {
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>();
  const [lastResult, setLastResult] = useState<RefreshResult>();
  const [refreshing, setRefreshing] = useState(false);

  const refreshNow = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await refresh();
      setLastResult(result);
      setLastUpdatedAt(new Date().toISOString());
      return result;
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  useEffect(() => {
    if (mode !== "interval") return undefined;
    const timer = window.setInterval(() => {
      void refreshNow();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [mode, refreshNow]);

  return { refreshNow, refreshing, lastUpdatedAt, lastResult };
}
