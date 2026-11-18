"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import { obligationApiQuery, type ObligationFilters } from "@/lib/obligations";
import type { Obligation, ObligationList } from "@/lib/types";

// Contas a pagar / a receber — AYD-007 §2.

/** Lista paginada (`GET /obligations`). `filters = null` não busca. */
export function useObligations(filters: ObligationFilters | null) {
  const { data, error, isLoading, mutate } = useSWR<ObligationList>(
    filters ? `/obligations?${obligationApiQuery(filters)}` : null,
    api.get,
  );
  return { list: data, isLoading, error, refresh: mutate };
}

/** Detalhe: componentes, parcelas e quitações. */
export function useObligation(id: string) {
  const { data, error, isLoading, mutate } = useSWR<Obligation>(
    id ? `/obligations/${id}` : null,
    api.get,
  );
  return { obligation: data, isLoading, error, refresh: mutate };
}

/** Contas de uma Sale ou Purchase (`origin_type` + `origin_id`). */
export function useOriginObligations(originType: "SALE" | "PURCHASE", originId: string) {
  const params = new URLSearchParams({ origin_type: originType, origin_id: originId, limit: "100" });
  const { data, error, isLoading, mutate } = useSWR<ObligationList>(
    originId ? `/obligations?${params.toString()}` : null,
    api.get,
  );
  return { obligations: data?.items ?? [], isLoading, error, refresh: mutate };
}

/**
 * Chaves SWR afetadas por pagar/receber/parcelar: contas, movimentações, painel, Sales,
 * Purchases (saldos vêm das contas) e dashboard.
 */
export function isAccountingKey(key: unknown): boolean {
  return (
    typeof key === "string" &&
    (key.startsWith("/obligations") ||
      key.startsWith("/financial-movements") ||
      key.startsWith("/finance") ||
      key.startsWith("/vendas") ||
      key.startsWith("/purchases") ||
      key.startsWith("/dashboard"))
  );
}
