"use client";

import useSWR from "swr";
import { http } from "@/lib/http";
import type { PendingActions } from "@/lib/types";

export function usePendingActions(horizonDays: number, enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<PendingActions>(
    enabled ? `/pending-actions?horizon_days=${horizonDays}` : null,
    http.get,
    { keepPreviousData: true },
  );
  return { data, isLoading, error, refresh: mutate };
}

export function useOverdueCount(enabled: boolean): number {
  const { data } = usePendingActions(7, enabled);
  return data?.total_overdue ?? 0;
}
