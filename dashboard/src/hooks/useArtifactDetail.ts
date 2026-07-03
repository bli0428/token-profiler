import { useCallback, useEffect, useRef, useState } from "react";
import type { DashboardClientError } from "../api/errors";
import type { DashboardApiClient } from "../api/client";
import type { ArtifactDetailResponse } from "../api/types";

export function useArtifactDetails(client: DashboardApiClient, runId: string | undefined, artifactIds: string[]) {
  const [data, setData] = useState<Record<string, ArtifactDetailResponse>>({});
  const [loadingIds, setLoadingIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, DashboardClientError>>({});
  const dataRef = useRef(data);
  const loadingIdsRef = useRef(loadingIds);
  const errorsRef = useRef(errors);
  const runIdRef = useRef(runId);
  const cachedRunIdRef = useRef<string | undefined>(undefined);
  const artifactIdsRef = useRef(artifactIds);

  dataRef.current = data;
  loadingIdsRef.current = loadingIds;
  errorsRef.current = errors;
  runIdRef.current = runId;
  artifactIdsRef.current = artifactIds;

  const reload = useCallback(async () => {
    const currentRunId = runIdRef.current;
    const uniqueIds = Array.from(new Set(artifactIdsRef.current));
    if (!currentRunId || uniqueIds.length === 0) {
      cachedRunIdRef.current = currentRunId;
      dataRef.current = {};
      loadingIdsRef.current = [];
      errorsRef.current = {};
      setData({});
      setLoadingIds([]);
      setErrors({});
      return;
    }

    if (cachedRunIdRef.current !== currentRunId) {
      cachedRunIdRef.current = currentRunId;
      dataRef.current = {};
      loadingIdsRef.current = [];
      errorsRef.current = {};
      setData({});
      setLoadingIds([]);
      setErrors({});
    }

    const expandedIds = new Set(uniqueIds);
    const retainedData = pickExpanded(dataRef.current, expandedIds);
    const retainedErrors = pickExpanded(errorsRef.current, expandedIds);
    const retainedLoadingIds = loadingIdsRef.current.filter((artifactId) => expandedIds.has(artifactId));
    const missingIds = uniqueIds.filter((artifactId) => !retainedData[artifactId] && !retainedLoadingIds.includes(artifactId));

    dataRef.current = retainedData;
    errorsRef.current = retainedErrors;
    loadingIdsRef.current = [...retainedLoadingIds, ...missingIds];
    setData(retainedData);
    setErrors(omitKeys(retainedErrors, missingIds));
    setLoadingIds(loadingIdsRef.current);

    if (missingIds.length === 0) return;

    const entries = await Promise.all(missingIds.map(async (artifactId) => {
      try {
        return [artifactId, await client.getArtifactDetail(currentRunId, artifactId), undefined] as const;
      } catch (caught) {
        return [artifactId, undefined, caught as DashboardClientError] as const;
      }
    }));

    const latestExpandedIds = new Set(artifactIdsRef.current);
    const nextData = pickExpanded(dataRef.current, latestExpandedIds);
    const nextErrors = pickExpanded(errorsRef.current, latestExpandedIds);
    for (const [artifactId, response, error] of entries) {
      if (!latestExpandedIds.has(artifactId)) continue;
      if (response) {
        nextData[artifactId] = response;
        delete nextErrors[artifactId];
      } else if (error) {
        nextErrors[artifactId] = error;
      }
    }

    dataRef.current = nextData;
    errorsRef.current = nextErrors;
    loadingIdsRef.current = loadingIdsRef.current.filter((artifactId) => !missingIds.includes(artifactId));
    setData(nextData);
    setErrors(nextErrors);
    setLoadingIds(loadingIdsRef.current);
  }, [client]);

  useEffect(() => {
    void reload();
  }, [artifactIds, reload, runId]);

  return { data, loadingIds, errors, reload };
}

function pickExpanded<T>(records: Record<string, T>, expandedIds: Set<string>): Record<string, T> {
  return Object.fromEntries(Object.entries(records).filter(([artifactId]) => expandedIds.has(artifactId)));
}

function omitKeys<T>(records: Record<string, T>, keys: string[]): Record<string, T> {
  const omitted = new Set(keys);
  return Object.fromEntries(Object.entries(records).filter(([key]) => !omitted.has(key)));
}
