"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import type { Partner, PartnerType } from "@/lib/types";

interface PartnersFilters {
  q?: string;
  type?: PartnerType;
}

function buildQuery(filters?: PartnersFilters): string {
  const params = new URLSearchParams();
  if (filters?.q) params.set("q", filters.q);
  if (filters?.type) params.set("type", filters.type);
  const qs = params.toString();
  return qs ? `/partners?${qs}` : "/partners";
}

export function usePartners(filters?: PartnersFilters) {
  const { data, error, isLoading, mutate } = useSWR<Partner[]>(
    buildQuery(filters),
    api.get,
  );
  return {
    partners: data ?? [],
    isLoading,
    error,
    refresh: mutate,
  };
}

export function usePartner(id: string) {
  const { data, error, isLoading, mutate } = useSWR<Partner>(
    id ? `/partners/${id}` : null,
    api.get,
  );
  return { partner: data, isLoading, error, refresh: mutate };
}
