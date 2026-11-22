"use client";

import useSWR from "swr";
import { http } from "@/lib/http";
import type { Obligation, ObligationList, PurchaseListItem } from "@/lib/types";
import type { PurchaseInfo } from "./model";

export function usePurchaseMap(enabled = true): Record<string, PurchaseInfo> {
  const { data } = useSWR<PurchaseListItem[]>(enabled ? "/purchases" : null, http.get);
  const map: Record<string, PurchaseInfo> = {};
  for (const p of data ?? []) {
    map[p.id] = { id: p.id, number: p.number, status: p.status, supplier_id: p.supplier_id, expected_date: p.expected_date };
  }
  return map;
}

export function useSaleObligations(saleId: string) {
  const params = new URLSearchParams({ origin_type: "SALE", origin_id: saleId, limit: "100" });
  const { data, isLoading } = useSWR<ObligationList>(saleId ? `/obligations?${params.toString()}` : null, http.get);
  const items: Obligation[] = data?.items ?? [];
  return {
    receivable: items.find((o) => o.direction === "RECEIVABLE") ?? null,
    payables: items.filter((o) => o.direction === "PAYABLE"),
    isLoading,
  };
}

export function useObligationDetail(id: string | null | undefined) {
  const { data } = useSWR<Obligation>(id ? `/obligations/${id}` : null, http.get);
  return data;
}
