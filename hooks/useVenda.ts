"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import type { Venda } from "@/lib/types";

export function useVenda(id: string) {
  const { data, error, isLoading, mutate } = useSWR<Venda>(
    id ? `/vendas/${id}` : null,
    api.get,
  );
  return {
    venda: data,
    isLoading,
    error,
    refresh: mutate,
  };
}
