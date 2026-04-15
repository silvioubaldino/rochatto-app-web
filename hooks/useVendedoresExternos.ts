"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import type { VendedorExterno } from "@/lib/types";

export function useVendedoresExternos() {
  const { data, error, isLoading, mutate } = useSWR<VendedorExterno[]>(
    "/vendedores-externos",
    api.get,
  );
  return {
    vendedoresExternos: data ?? [],
    isLoading,
    error,
    refresh: mutate,
  };
}

export function useVendedorExterno(id: string) {
  const { data, error, isLoading, mutate } = useSWR<VendedorExterno>(
    id ? `/vendedores-externos/${id}` : null,
    api.get,
  );
  return { vendedorExterno: data, isLoading, error, refresh: mutate };
}
