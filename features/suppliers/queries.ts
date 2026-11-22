"use client";

import useSWR from "swr";
import { http } from "@/lib/http";
import type { ObligationList } from "@/lib/types";

export function useSupplierPayables(supplierId: string) {
  const p = new URLSearchParams({
    direction: "PAYABLE",
    status: "OPEN,PARTIAL",
    counterparty_type: "SUPPLIER",
    counterparty_id: supplierId,
    limit: "100",
  });
  const { data, isLoading } = useSWR<ObligationList>(supplierId ? `/obligations?${p.toString()}` : null, http.get);
  return { items: data?.items ?? [], isLoading };
}
