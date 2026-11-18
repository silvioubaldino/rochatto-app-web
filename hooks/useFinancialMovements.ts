"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import { movementApiQuery, type MovementFilters } from "@/lib/obligations";
import type { FinancialMovementList } from "@/lib/types";

// Movimentações — AYD-007 §4: GET /financial-movements.
export function useFinancialMovements(filters: MovementFilters | null) {
  const { data, error, isLoading, mutate } = useSWR<FinancialMovementList>(
    filters ? `/financial-movements?${movementApiQuery(filters)}` : null,
    api.get,
  );
  return { list: data, isLoading, error, refresh: mutate };
}
