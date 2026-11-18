"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import type { StockAdjustment, StockBalance, StockStatement } from "@/lib/types";

// Stock — AYD-002 §4. Substitui o legado `/estoque`.

export interface StockBalanceFilters {
  q?: string;
  only_negative?: boolean;
}

export function useStockBalance(filters?: StockBalanceFilters) {
  const params = new URLSearchParams();
  if (filters?.q) params.set("q", filters.q);
  if (filters?.only_negative) params.set("only_negative", "true");
  const qs = params.toString();
  const { data, error, isLoading, mutate } = useSWR<StockBalance[]>(
    qs ? `/stock/balance?${qs}` : "/stock/balance",
    api.get,
  );
  return { balances: data ?? [], isLoading, error, refresh: mutate };
}

/** Balance + extrato de um Product. */
export function useStockStatement(productId: string | null | undefined) {
  const { data, error, isLoading, mutate } = useSWR<StockStatement>(
    productId ? `/stock/balance/${productId}` : null,
    api.get,
  );
  return { statement: data, isLoading, error, refresh: mutate };
}

export function useStockAdjustments(productId?: string) {
  const { data, error, isLoading, mutate } = useSWR<StockAdjustment[]>(
    productId
      ? `/stock/adjustments?product_id=${encodeURIComponent(productId)}`
      : "/stock/adjustments",
    api.get,
  );
  return { adjustments: data ?? [], isLoading, error, refresh: mutate };
}
