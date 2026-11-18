"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import type { AuthorizationRequest, Connection } from "@/lib/types";

/** Connections ativas do Assistant connector (AYD-006 §2.7). */
export function useConnections() {
  const { data, error, isLoading, mutate } = useSWR<Connection[]>(
    "/oauth/connections",
    api.get,
  );
  return { connections: data ?? [], isLoading, error, refresh: mutate };
}

/**
 * Pedido de conexão pendente (AYD-006 §2.4). Só lê uma vez: depois de decidido o pedido
 * some (404), então não revalida em foco/reconexão nem refaz tentativas.
 */
export function useAuthorizationRequest(id: string | null) {
  const { data, error, isLoading } = useSWR<AuthorizationRequest>(
    id ? `/oauth/authorization-requests/${encodeURIComponent(id)}` : null,
    api.get,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
    },
  );
  return { request: data, isLoading, error };
}
