"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import type {
  PendingSaleItemGroup,
  PurchaseDetail,
  PurchaseKind,
  PurchaseListItem,
  PurchaseStatus,
} from "@/lib/types";

// Purchases — AYD-002 §3.

export interface PurchasesFilters {
  kind?: PurchaseKind;
  status?: PurchaseStatus;
  supplier_id?: string;
  from?: string;
  to?: string;
}

function buildQuery(filters?: PurchasesFilters): string {
  const params = new URLSearchParams();
  if (filters?.kind) params.set("kind", filters.kind);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.supplier_id) params.set("supplier_id", filters.supplier_id);
  if (filters?.from) params.set("from", filters.from);
  if (filters?.to) params.set("to", filters.to);
  const qs = params.toString();
  return qs ? `/purchases?${qs}` : "/purchases";
}

export function usePurchases(filters?: PurchasesFilters) {
  const { data, error, isLoading, mutate } = useSWR<PurchaseListItem[]>(
    buildQuery(filters),
    api.get,
  );
  return { purchases: data ?? [], isLoading, error, refresh: mutate };
}

export function usePurchase(id: string) {
  const { data, error, isLoading, mutate } = useSWR<PurchaseDetail>(
    id ? `/purchases/${id}` : null,
    api.get,
  );
  return { purchase: data, isLoading, error, refresh: mutate };
}

/** Fila "a comprar": Items MADE_TO_ORDER sem Purchase, agrupados por Supplier (RF-31). */
export function usePendingSaleItems() {
  const { data, error, isLoading, mutate } = useSWR<PendingSaleItemGroup[]>(
    "/purchases/pending-sale-items",
    api.get,
  );
  return { groups: data ?? [], isLoading, error, refresh: mutate };
}

/** Chaves SWR afetadas por mudanças em Purchases (lista, fila, Stock e Sales). */
export function isPurchaseRelatedKey(key: unknown): boolean {
  return (
    typeof key === "string" &&
    (key.startsWith("/purchases") ||
      key.startsWith("/stock") ||
      key.startsWith("/vendas") ||
      key.startsWith("/obligations") ||
      key.startsWith("/financial-movements") ||
      key.startsWith("/finance") ||
      key.startsWith("/dashboard"))
  );
}
