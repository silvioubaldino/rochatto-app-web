"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import type { Cliente, LeadSource } from "@/lib/types";

interface ClientesFilters {
  lead_source?: LeadSource;
  referrer_id?: string;
}

/**
 * Lista de Customers. Sem busca → `GET /clientes` com os filtros do AYD-003
 * (`lead_source`, `referrer_id`). Com busca → `GET /clientes/search?q=` (legado, sem esses
 * filtros no contrato); nesse caso os filtros são aplicados sobre o resultado da busca.
 */
export function useClientes(search?: string, filters?: ClientesFilters) {
  let key: string;
  if (search) {
    key = `/clientes/search?q=${encodeURIComponent(search)}`;
  } else {
    const params = new URLSearchParams();
    if (filters?.lead_source) params.set("lead_source", filters.lead_source);
    if (filters?.referrer_id) params.set("referrer_id", filters.referrer_id);
    const qs = params.toString();
    key = qs ? `/clientes?${qs}` : "/clientes";
  }
  const { data, error, isLoading, mutate } = useSWR<Cliente[]>(key, api.get);

  let clientes = data ?? [];
  if (search && filters?.lead_source) {
    clientes = clientes.filter((c) => c.lead_source === filters.lead_source);
  }
  if (search && filters?.referrer_id) {
    clientes = clientes.filter((c) => c.referrer_id === filters.referrer_id);
  }

  return {
    clientes,
    isLoading,
    error,
    refresh: mutate,
  };
}

export function useCliente(id: string) {
  const { data, error, isLoading, mutate } = useSWR<Cliente>(
    id ? `/clientes/${id}` : null,
    api.get,
  );
  return { cliente: data, isLoading, error, refresh: mutate };
}
