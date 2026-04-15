"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import type { Cliente } from "@/lib/types";

export function useClientes(search?: string) {
  const key = search ? `/clientes/search?q=${search}` : "/clientes";
  const { data, error, isLoading, mutate } = useSWR<Cliente[]>(key, api.get);
  return {
    clientes: data ?? [],
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
