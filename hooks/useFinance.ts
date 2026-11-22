"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import type { FinanceSummary } from "@/lib/types";

export function useFinanceSummary(from: string, to: string, enabled = true) {
  const params = new URLSearchParams({ from, to });
  const { data, error, isLoading, mutate } = useSWR<FinanceSummary>(
    enabled ? `/finance/summary?${params.toString()}` : null,
    api.get,
  );
  return { summary: data, isLoading, error, refresh: mutate };
}
