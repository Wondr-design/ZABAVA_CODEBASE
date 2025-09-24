import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_BASE_URL } from "@/lib/config";
import type { PartnerDashboardData, SubmissionRecord } from "@/types/dashboard";

interface UsePartnerDataOptions {
  token?: string | null;
  onUnauthorized?: () => void;
  refreshIntervalMs?: number;
  autoRefresh?: boolean;
}

interface UsePartnerDataResult {
  data: PartnerDashboardData | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

function getTimestamp(value?: string | null): number {
  if (!value) {
    return 0;
  }
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function sortPartnerSubmissions(
  submissions: PartnerDashboardData["submissions"]
): SubmissionRecord[] {
  if (!Array.isArray(submissions)) {
    return [];
  }
  return [...submissions].sort(
    (a, b) => getTimestamp(b?.createdAt ?? null) - getTimestamp(a?.createdAt ?? null)
  );
}

export function usePartnerData(
  partnerId: string | undefined,
  options: UsePartnerDataOptions = {}
): UsePartnerDataResult {
  const {
    token,
    onUnauthorized,
    refreshIntervalMs = 30000,
    autoRefresh = true,
  } = options;
  const [data, setData] = useState<PartnerDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const abortController = useRef<AbortController | null>(null);
  const hasLoadedRef = useRef<boolean>(false);

  const canFetch = useMemo(
    () => Boolean(partnerId && token),
    [partnerId, token]
  );

  useEffect(() => {
    if (!canFetch) {
      setData(null);
      hasLoadedRef.current = false;
    }
  }, [canFetch]);

  useEffect(() => {
    hasLoadedRef.current = false;
  }, [partnerId]);

  const fetchData = useCallback(
    async ({ background = false }: { background?: boolean } = {}): Promise<void> => {
      if (!canFetch || !partnerId || !token) {
        return;
      }

      if (abortController.current) {
        abortController.current.abort();
      }

      const controller = new AbortController();
      abortController.current = controller;

      try {
        if (!background) {
          setLoading(true);
        }
        setError(null);

        const response = await fetch(`${API_BASE_URL}/api/partner/${partnerId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        if (response.status === 401 || response.status === 403) {
          onUnauthorized?.();
          throw new Error("Unauthorized");
        }

        if (!response.ok) {
          throw new Error(
            `Request failed: ${response.status} ${response.statusText}`
          );
        }

        const result = (await response.json()) as PartnerDashboardData;
        const normalized: PartnerDashboardData = {
          ...result,
          submissions: sortPartnerSubmissions(result.submissions),
        };
        setData(normalized);
        hasLoadedRef.current = true;
      } catch (unknownError) {
        const err = unknownError as Error;
        if (err.name === "AbortError") {
          return;
        }
        setError(err);
        console.error("Error fetching partner data:", err);
      } finally {
        if (!background) {
          setLoading(false);
        }
      }
    },
    [canFetch, onUnauthorized, partnerId, token]
  );

  useEffect(() => {
    if (canFetch) {
      void fetchData({ background: hasLoadedRef.current });
    }
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, [canFetch, fetchData]);

  useEffect(() => {
    if (!autoRefresh || !canFetch || refreshIntervalMs <= 0) {
      return undefined;
    }
    if (typeof window === "undefined") {
      return undefined;
    }

    const interval = window.setInterval(() => {
      void fetchData({ background: hasLoadedRef.current });
    }, refreshIntervalMs);

    return () => {
      window.clearInterval(interval);
    };
  }, [autoRefresh, canFetch, fetchData, refreshIntervalMs]);

  const refetch = useCallback(async (): Promise<void> => {
    if (canFetch) {
      await fetchData({ background: hasLoadedRef.current });
    }
  }, [canFetch, fetchData]);

  return { data, loading, error, refetch };
}
