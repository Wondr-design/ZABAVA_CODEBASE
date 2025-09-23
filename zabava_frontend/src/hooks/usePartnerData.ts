import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_BASE_URL } from "@/lib/config";
import type { PartnerDashboardData } from "@/types/dashboard";

interface UsePartnerDataOptions {
  token?: string | null;
  onUnauthorized?: () => void;
}

interface UsePartnerDataResult {
  data: PartnerDashboardData | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function usePartnerData(
  partnerId: string | undefined,
  { token, onUnauthorized }: UsePartnerDataOptions = {}
): UsePartnerDataResult {
  const [data, setData] = useState<PartnerDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const abortController = useRef<AbortController | null>(null);

  const canFetch = useMemo(
    () => Boolean(partnerId && token),
    [partnerId, token]
  );

  const fetchData = useCallback(async (): Promise<void> => {
    if (!canFetch || !partnerId || !token) {
      return;
    }

    if (abortController.current) {
      abortController.current.abort();
    }

    const controller = new AbortController();
    abortController.current = controller;

    try {
      setLoading(true);
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
      setData(result);
    } catch (unknownError) {
      const err = unknownError as Error;
      if (err.name === "AbortError") {
        return;
      }
      setError(err);
      console.error("Error fetching partner data:", err);
    } finally {
      setLoading(false);
    }
  }, [canFetch, onUnauthorized, partnerId, token]);

  useEffect(() => {
    if (canFetch) {
      void fetchData();
    }
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, [canFetch, fetchData]);

  const refetch = useCallback(async (): Promise<void> => {
    if (canFetch) {
      await fetchData();
    }
  }, [canFetch, fetchData]);

  return { data, loading, error, refetch };
}
