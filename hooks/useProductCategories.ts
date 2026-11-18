"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import type { ProductCategory } from "@/lib/types";

/** Categorias ativas, em ordem alfabética (ordenação feita pela API). */
export function useProductCategories() {
  const { data, error, isLoading, mutate } = useSWR<ProductCategory[]>(
    "/product-categories",
    api.get,
  );
  return {
    categories: data ?? [],
    isLoading,
    error,
    refresh: mutate,
  };
}
