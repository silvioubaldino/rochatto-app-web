"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import type { Produto } from "@/lib/types";

export function useProdutos() {
  const { data, error, isLoading, mutate } = useSWR<Produto[]>(
    "/produtos",
    api.get,
  );
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
