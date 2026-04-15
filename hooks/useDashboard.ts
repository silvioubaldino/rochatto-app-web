"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import type {
  DashboardResumo,
  Notificacao,
  VendasPorMes,
  ProdutoMaisVendido,
  NotificacoesResponse,
  VendasPorMesResponse,
  ProdutosMaisVendidosResponse,
} from "@/lib/types";

export function useDashboardResumo(dataInicio: string, dataFim: string) {
  const key =
    dataInicio && dataFim
      ? `/dashboard/resumo?data_inicio=${dataInicio}&data_fim=${dataFim}`
      : null;
  const { data, error, isLoading, mutate } = useSWR<DashboardResumo>(
    key,
    api.get,
  );
  return { resumo: data ?? null, isLoading, error, refresh: mutate };
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
  dataInicio?: string,
  dataFim?: string,
) {
  const params = new URLSearchParams();
  if (dataInicio) params.set("data_inicio", dataInicio);
  if (dataFim) params.set("data_fim", dataFim);
  const qs = params.toString();
  const key = qs ? `/relatorios/produtos?${qs}` : "/relatorios/produtos";

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
