"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import type { Fornecedor, SupplierKind } from "@/lib/types";

export function useFornecedores(kind?: SupplierKind) {
  const { data, error, isLoading, mutate } = useSWR<Fornecedor[]>(
    kind ? `/fornecedores?kind=${kind}` : "/fornecedores",
    api.get,
  );
  return {
    fornecedores: data ?? [],
    isLoading,
    error,
    refresh: mutate,
  };
}

export function useFornecedor(id: string) {
  const { data, error, isLoading, mutate } = useSWR<Fornecedor>(
    id ? `/fornecedores/${id}` : null,
    api.get,
  );
  return { fornecedor: data, isLoading, error, refresh: mutate };
}
