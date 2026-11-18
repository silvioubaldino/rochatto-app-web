"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import type {
  DashboardKpis,
  NotificacoesResponse,
  VendasPorMesResponse,
  ProdutosMaisVendidosResponse,
} from "@/lib/types";

export function useDashboardKpis(from: string, to: string, enabled = true) {
  const key =
    enabled && from && to ? `/dashboard/kpis?from=${from}&to=${to}` : null;
  const { data, error, isLoading, mutate } = useSWR<DashboardKpis>(
    key,
    api.get,
  );
  return { kpis: data ?? null, isLoading, error, refresh: mutate };
}

export function useNotificacoes() {
  const { data, error, isLoading, mutate } = useSWR<NotificacoesResponse>(
    "/dashboard/notificacoes",
    api.get,
    { refreshInterval: 5 * 60 * 1000 },
  );
  return {
    notificacoes: data?.notificacoes ?? [],
    isLoading,
    error,
    refresh: mutate,
  };
}

export function useVendasPorMes(meses: number) {
  const { data, error, isLoading, mutate } = useSWR<VendasPorMesResponse>(
    `/relatorios/vendas?meses=${meses}`,
    api.get,
  );
  return { vendasPorMes: data?.dados ?? [], isLoading, error, refresh: mutate };
}

export function useProdutosMaisVendidos(
  from?: string,
  to?: string,
  enabled = true,
) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString();
  const key = enabled
    ? qs
      ? `/relatorios/produtos?${qs}`
      : "/relatorios/produtos"
    : null;

  const { data, error, isLoading, mutate } = useSWR<ProdutosMaisVendidosResponse>(
    key,
    api.get,
  );
  return {
    produtos: data?.dados ?? [],
    isLoading,
    error,
    refresh: mutate,
  };
}
