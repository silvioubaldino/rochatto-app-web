"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import type { AuthorizationRequest, Connection } from "@/lib/types";

export function useConnections() {
  const { data, error, isLoading, mutate } = useSWR<Connection[]>(
    "/oauth/connections",
    api.get,
  );
  return { connections: data ?? [], isLoading, error, refresh: mutate };
}

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

export async function revokeConnection(id: string): Promise<void> {
  await api.delete(`/oauth/connections/${id}`);
}

export function decideAuthorization<T>(requestId: string, action: "approve" | "deny"): Promise<T> {
  return api.post<T>(`/oauth/authorization-requests/${encodeURIComponent(requestId)}/${action}`, {});
}
