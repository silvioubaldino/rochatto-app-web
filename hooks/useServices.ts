"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import type { Service } from "@/lib/types";

export function useServices(q?: string) {
  const key = q ? `/services?q=${encodeURIComponent(q)}` : "/services";
  const { data, error, isLoading, mutate } = useSWR<Service[]>(key, api.get);
  return {
    services: Array.isArray(data) ? data : [],
    isLoading,
    error,
    refresh: mutate,
  };
}
