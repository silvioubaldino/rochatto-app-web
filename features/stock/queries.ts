"use client";

import useSWR from "swr";
import { http } from "@/lib/http";
import type { StockAdjustment, StockBalance, StockStatement } from "@/lib/types";
import { stockBalanceQuery, totalStockValue, type StockBalanceFilters } from "./model";

type BalanceResponse = StockBalance[] | { items: StockBalance[]; total_stock_value?: number };

/** Saldo por Product (a api devolve a lista, ou lista + total em estoque). */
export function useStockBalance(filters: StockBalanceFilters = {}) {
  const { data, error, isLoading, mutate } = useSWR<BalanceResponse>(stockBalanceQuery(filters), http.get);
  const balances = (Array.isArray(data) ? data : data?.items) ?? [];
  const total = totalStockValue(balances, Array.isArray(data) ? undefined : data?.total_stock_value);
  return { balances, totalStockValue: total, isLoading, error, refresh: mutate };
}

/** Balance + extrato de um Product. */
export function useStockStatement(productId: string | null | undefined) {
  const { data, error, isLoading, mutate } = useSWR<StockStatement>(productId ? `/stock/balance/${productId}` : null, http.get);
  return { statement: data, isLoading, error, refresh: mutate };
}

export function useStockAdjustments(productId?: string) {
  const { data, error, isLoading, mutate } = useSWR<StockAdjustment[]>(
    productId ? `/stock/adjustments?product_id=${encodeURIComponent(productId)}` : "/stock/adjustments",
    http.get,
  );
  return { adjustments: data ?? [], isLoading, error, refresh: mutate };
}
