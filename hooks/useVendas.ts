"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import type { Venda, SaleDeliveryStatus, SalePaymentStatus } from "@/lib/types";

export interface VendasFilters {
  delivery_status?: SaleDeliveryStatus;
  payment_status?: SalePaymentStatus;
  data_inicio?: string;
  data_fim?: string;
  cliente_id?: string;
  pendente?: boolean;
}

function buildQuery(filters?: VendasFilters): string {
  if (!filters) return "/vendas";
  const params = new URLSearchParams();
  if (filters.delivery_status) params.set("delivery_status", filters.delivery_status);
  if (filters.payment_status) params.set("payment_status", filters.payment_status);
  if (filters.data_inicio) params.set("data_inicio", filters.data_inicio);
  if (filters.data_fim) params.set("data_fim", filters.data_fim);
  if (filters.cliente_id) params.set("cliente_id", filters.cliente_id);
  if (filters.pendente !== undefined) params.set("pendente", String(filters.pendente));
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
