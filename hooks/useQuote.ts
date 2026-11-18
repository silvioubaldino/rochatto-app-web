"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import type { Quote } from "@/lib/types";

export function useQuote(id: string) {
  const { data, error, isLoading, mutate } = useSWR<Quote>(
    id ? `/quotes/${id}` : null,
    api.get,
  );
  return {
    quote: data,
    isLoading,
    error,
    refresh: mutate,
  };
}
