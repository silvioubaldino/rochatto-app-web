"use client";

import useSWR from "swr";
import { http } from "@/lib/http";
import { movementApiQuery, obligationApiQuery, type MovementFilters, type ObligationFilters } from "@/lib/obligations";
import type { FinancialMovementList, Obligation, ObligationList } from "@/lib/types";

export function useObligations(filters: ObligationFilters | null) {
  const { data, error, isLoading, mutate } = useSWR<ObligationList>(filters ? `/obligations?${obligationApiQuery(filters)}` : null, http.get);
  return { list: data, isLoading, error, refresh: mutate };
}

export function useObligation(id: string | null | undefined) {
  const { data, error, isLoading, mutate } = useSWR<Obligation>(id ? `/obligations/${id}` : null, http.get);
  return { obligation: data, isLoading, error, refresh: mutate };
}

export function useObligationsByIds(ids: readonly string[] | undefined) {
  const { data, error, isLoading } = useSWR<Obligation[]>(
    ids && ids.length > 0 ? ["settle-obligations", ...ids] : null,
    ([, ...list]: string[]) => Promise.all(list.map((id) => http.get<Obligation>(`/obligations/${id}`))),
  );
  return { obligations: data, isLoading, error };
}

export function useFinancialMovements(filters: MovementFilters | null) {
  const { data, error, isLoading, mutate } = useSWR<FinancialMovementList>(filters ? `/financial-movements?${movementApiQuery(filters)}` : null, http.get);
  return { list: data, isLoading, error, refresh: mutate };
}
