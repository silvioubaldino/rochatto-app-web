"use client";

import useSWR from "swr";
import { useEntityOptions } from "@/components/entity/entity-queries";
import { http } from "@/lib/http";
import type { StockBalance } from "@/lib/types";

/**
 * O que o Fechar venda consulta: fornecedor habitual por produto (C8) e saldo atual (aviso
 * de estoque, RN-16). Mesmas chaves das listas, então os eventos de domínio revalidam.
 */
export function useClosingLookups(enabled: boolean) {
  const products = useEntityOptions("product", "", enabled).options;
  const { data } = useSWR<StockBalance[] | { items: StockBalance[] }>(enabled ? "/stock/balance" : null, http.get);
  const rows = (Array.isArray(data) ? data : data?.items) ?? [];
  const defaultSuppliers = new Map<string, string>();
  for (const o of products) if (o.raw.default_supplier_id) defaultSuppliers.set(o.id, o.raw.default_supplier_id);
  const balances = new Map(rows.map((b) => [b.product_id, b.balance]));
  return { defaultSuppliers, balances };
}
