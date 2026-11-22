"use client";

import useSWR from "swr";
import { http } from "@/lib/http";
import type { PendingSaleItemGroup, PurchaseDetail, PurchaseListItem, Venda } from "@/lib/types";
import { purchasesQuery, type PurchaseListFilters } from "./model";

export function usePendingPurchaseQueue(enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<PendingSaleItemGroup[]>(
    enabled ? "/purchases/pending-sale-items" : null,
    http.get,
  );
  return { groups: data ?? [], isLoading, error, refresh: mutate };
}

export function usePurchases(filters: PurchaseListFilters | null = {}) {
  const { data, error, isLoading, mutate } = useSWR<PurchaseListItem[]>(filters ? purchasesQuery(filters) : null, http.get);
  return { purchases: data ?? [], isLoading, error, refresh: mutate };
}

export function usePurchaseList(enabled = true) {
  return usePurchases(enabled ? {} : null);
}

export function usePurchase(id: string) {
  const { data, error, isLoading, mutate } = useSWR<PurchaseDetail>(id ? `/purchases/${id}` : null, http.get);
  return { purchase: data, isLoading, error, refresh: mutate };
}

export function useSalesById(enabled: boolean) {
  const { data } = useSWR<Venda[]>(enabled ? "/vendas" : null, http.get);
  const map: Record<string, { number?: number; delivery_status: Venda["delivery_status"] }> = {};
  for (const s of data ?? []) map[s.id] = { number: s.number, delivery_status: s.delivery_status };
  return map;
}
