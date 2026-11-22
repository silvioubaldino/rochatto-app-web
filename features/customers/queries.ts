"use client";

import useSWR from "swr";
import { http } from "@/lib/http";
import type { ObligationList } from "@/lib/types";

/** Contas a receber em aberto de um cliente (`/obligations`, mesma base das telas de contas). */
export function useCustomerReceivables(customerId: string) {
  const p = new URLSearchParams({
    direction: "RECEIVABLE",
    status: "OPEN,PARTIAL",
    counterparty_type: "CUSTOMER",
    counterparty_id: customerId,
    limit: "100",
  });
  const { data, isLoading } = useSWR<ObligationList>(customerId ? `/obligations?${p.toString()}` : null, http.get);
  return { items: data?.items ?? [], isLoading };
}
