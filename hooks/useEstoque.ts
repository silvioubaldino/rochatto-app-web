"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import type { EstoqueEntrada, EstoqueResumo } from "@/lib/types";

interface EstoqueFilters {
  produto_id?: string;
  data_inicio?: string;
  data_fim?: string;
}

function buildKey(filters?: EstoqueFilters): string {
  if (!filters) return "/estoque";
  const params = new URLSearchParams();
  if (filters.produto_id) params.set("produto_id", filters.produto_id);
  if (filters.data_inicio) params.set("data_inicio", filters.data_inicio);
  if (filters.data_fim) params.set("data_fim", filters.data_fim);
  const qs = params.toString();
  return qs ? `/estoque?${qs}` : "/estoque";
}

export function useEstoque(filters?: EstoqueFilters) {
  const key = buildKey(filters);
  const { data, error, isLoading, mutate } = useSWR<EstoqueEntrada[]>(
    key,
    api.get,
  );
  return {
    entradas: data ?? [],
    isLoading,
    error,
    refresh: mutate,
  };
}

export function useResumoEstoque() {
  const { data, error, isLoading, mutate } = useSWR<EstoqueResumo[]>(
    "/estoque/resumo",
    api.get,
  );
  return {
    resumo: data ?? [],
    isLoading,
    error,
    refresh: mutate,
  };
}
