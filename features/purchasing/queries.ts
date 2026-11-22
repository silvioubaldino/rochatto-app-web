"use client";

import useSWR from "swr";
import { http } from "@/lib/http";
import type { PendingSaleItemGroup, PurchaseListItem } from "@/lib/types";

/** Fila "a comprar": Items MADE_TO_ORDER sem Purchase, agrupados por Supplier (RF-31). */
export function usePendingPurchaseQueue(enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<PendingSaleItemGroup[]>(
    enabled ? "/purchases/pending-sale-items" : null,
    http.get,
  );
  return { groups: data ?? [], isLoading, error, refresh: mutate };
}

/** Compras (lista) — usadas para o estado das compras de uma venda e "adicionar à compra aberta". */
export function usePurchaseList(enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<PurchaseListItem[]>(enabled ? "/purchases" : null, http.get);
  return { purchases: data ?? [], isLoading, error, refresh: mutate };
}
