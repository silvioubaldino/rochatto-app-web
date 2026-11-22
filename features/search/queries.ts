"use client";

import useSWR from "swr";
import { http } from "@/lib/http";
import type { SearchResponse } from "@/lib/types";

export const SEARCH_MIN_CHARS = 2;

export function useGlobalSearch(q: string, enabled = true) {
  const term = q.trim();
  const key = enabled && term.length >= SEARCH_MIN_CHARS ? `/search?q=${encodeURIComponent(term)}&limit=5` : null;
  const { data, error, isLoading } = useSWR<SearchResponse>(key, http.get, { keepPreviousData: true });
  return { groups: data?.groups ?? [], isLoading: !!key && isLoading, error, searched: !!key };
}
