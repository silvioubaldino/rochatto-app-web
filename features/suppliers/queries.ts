"use client";

import useSWR from "swr";
import { http } from "@/lib/http";
import type { ObligationList } from "@/lib/types";

/** Contas a pagar em aberto a um fornecedor/prestador (`/obligations`, mesma base das telas de contas). */
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
