"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import type { Quote, QuoteStatus } from "@/lib/types";

interface QuotesFilters {
  status?: QuoteStatus;
  from?: string;
  to?: string;
  customer_id?: string;
  q?: string;
  referrer_id?: string;
}

function buildQuery(filters?: QuotesFilters): string {
  if (!filters) return "/quotes";
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.customer_id) params.set("customer_id", filters.customer_id);
  if (filters.q) params.set("q", filters.q);
  if (filters.referrer_id) params.set("referrer_id", filters.referrer_id);
  const qs = params.toString();
  return qs ? `/quotes?${qs}` : "/quotes";
}

export function useQuotes(filters?: QuotesFilters) {
  const key = buildQuery(filters);
  const { data, error, isLoading, mutate } = useSWR<Quote[]>(key, api.get);
  return {
    quotes: data ?? [],
    isLoading,
    error,
    refresh: mutate,
  };
}
