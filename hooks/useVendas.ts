"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import type { Venda, SaleDeliveryStatus, SalePaymentStatus } from "@/lib/types";

export interface VendasFilters {
  delivery_status?: SaleDeliveryStatus;
  /** um status ou vários separados por vírgula (ex.: "PENDING,PARTIAL") */
  payment_status?: SalePaymentStatus | "PENDING,PARTIAL";
  data_inicio?: string;
  data_fim?: string;
  cliente_id?: string;
  /** data_venda entre from e to (inclusive), YYYY-MM-DD */
  from?: string;
  to?: string;
}

function buildQuery(filters?: VendasFilters): string {
  if (!filters) return "/vendas";
  const params = new URLSearchParams();
  if (filters.delivery_status) params.set("delivery_status", filters.delivery_status);
  if (filters.payment_status) params.set("payment_status", filters.payment_status);
  if (filters.data_inicio) params.set("data_inicio", filters.data_inicio);
  if (filters.data_fim) params.set("data_fim", filters.data_fim);
  if (filters.cliente_id) params.set("cliente_id", filters.cliente_id);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  const qs = params.toString();
  return qs ? `/vendas?${qs}` : "/vendas";
}

export function useVendas(filters?: VendasFilters) {
  const key = buildQuery(filters);
  const { data, error, isLoading, mutate } = useSWR<Venda[]>(key, api.get);
  return {
    vendas: data ?? [],
    isLoading,
    error,
    refresh: mutate,
  };
}
