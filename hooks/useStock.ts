"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import type { StockAdjustment, StockBalance, StockStatement } from "@/lib/types";

// Stock — AYD-002 §4. Substitui o legado `/estoque`.

export interface StockBalanceFilters {
  q?: string;
  only_negative?: boolean;
}

type StockBalanceResponse = StockBalance[] | { items: StockBalance[]; total_stock_value?: number };

export function useStockBalance(filters?: StockBalanceFilters) {
  const params = new URLSearchParams();
  if (filters?.q) params.set("q", filters.q);
  if (filters?.only_negative) params.set("only_negative", "true");
  const qs = params.toString();
  const { data, error, isLoading, mutate } = useSWR<StockBalanceResponse>(
    qs ? `/stock/balance?${qs}` : "/stock/balance",
    api.get,
  );
  // AYD-008 §4 não fixa onde vem `total_stock_value` (a resposta era um array): aceita o array
  // puro (soma `stock_value` aqui) ou um objeto `{ items, total_stock_value }`.
  const balances = (Array.isArray(data) ? data : data?.items) ?? [];
  const totalStockValue =
    (!Array.isArray(data) ? data?.total_stock_value : undefined) ??
    balances.reduce((sum, b) => sum + (b.stock_value ?? 0), 0);
  return { balances, totalStockValue, isLoading, error, refresh: mutate };
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
