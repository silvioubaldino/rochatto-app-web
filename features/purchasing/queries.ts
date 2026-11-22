"use client";

import useSWR from "swr";
import { http } from "@/lib/http";
import type { PendingSaleItemGroup, PurchaseDetail, PurchaseListItem, Venda } from "@/lib/types";
import { purchasesQuery, type PurchaseListFilters } from "./model";

/** Fila "a comprar": Items MADE_TO_ORDER sem Purchase, agrupados por Supplier (RF-31). */
export function usePendingPurchaseQueue(enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<PendingSaleItemGroup[]>(
    enabled ? "/purchases/pending-sale-items" : null,
    http.get,
  );
  return { groups: data ?? [], isLoading, error, refresh: mutate };
}

/** Compras (lista, com ou sem filtros) — a chave é o caminho da api, para os eventos a revalidarem. */
export function usePurchases(filters: PurchaseListFilters | null = {}) {
  const { data, error, isLoading, mutate } = useSWR<PurchaseListItem[]>(filters ? purchasesQuery(filters) : null, http.get);
  return { purchases: data ?? [], isLoading, error, refresh: mutate };
}

/** Compras (lista completa) — estado das compras de uma venda e "adicionar à compra aberta". */
export function usePurchaseList(enabled = true) {
  return usePurchases(enabled ? {} : null);
}

/** Uma compra em detalhe (linhas, composição, contas). */
export function usePurchase(id: string) {
  const { data, error, isLoading, mutate } = useSWR<PurchaseDetail>(id ? `/purchases/${id}` : null, http.get);
  return { purchase: data, isLoading, error, refresh: mutate };
}

/** Vendas por id (número e situação de entrega) — as linhas da compra só trazem `sale_id`. */
export function useSalesById(enabled: boolean) {
  const { data } = useSWR<Venda[]>(enabled ? "/vendas" : null, http.get);
  const map: Record<string, { number?: number; delivery_status: Venda["delivery_status"] }> = {};
  for (const s of data ?? []) map[s.id] = { number: s.number, delivery_status: s.delivery_status };
  return map;
}
