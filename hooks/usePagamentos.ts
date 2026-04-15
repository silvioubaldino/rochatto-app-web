"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import type { PagamentoCliente } from "@/lib/types";

export function usePagamentos(vendaId: string) {
  const { data, error, isLoading, mutate } = useSWR<PagamentoCliente[]>(
    vendaId ? `/vendas/${vendaId}/pagamentos` : null,
    api.get,
  );
  return {
    pagamentos: data ?? [],
    isLoading,
    error,
    refresh: mutate,
  };
}
