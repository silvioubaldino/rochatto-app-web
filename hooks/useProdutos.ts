"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import type { Produto } from "@/lib/types";

interface ProdutosFilters {
  category_id?: string;
}

export function useProdutos(filters?: ProdutosFilters) {
  const key = filters?.category_id
    ? `/produtos?category_id=${encodeURIComponent(filters.category_id)}`
    : "/produtos";
  const { data, error, isLoading, mutate } = useSWR<Produto[]>(key, api.get);
  return {
    produtos: data ?? [],
    isLoading,
    error,
    refresh: mutate,
  };
}

export function useProduto(id: string) {
  const { data, error, isLoading, mutate } = useSWR<Produto>(
    id ? `/produtos/${id}` : null,
    api.get,
  );
  return { produto: data, isLoading, error, refresh: mutate };
}
