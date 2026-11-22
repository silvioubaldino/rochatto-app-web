"use client";

import useSWR from "swr";
import { http } from "@/lib/http";
import type { ObligationList } from "@/lib/types";

export function usePartnerCommissions(partnerId: string) {
  const p = new URLSearchParams({
    direction: "PAYABLE",
    status: "OPEN,PARTIAL",
    counterparty_type: "PARTNER",
    counterparty_id: partnerId,
    limit: "100",
  });
  const { data, isLoading } = useSWR<ObligationList>(partnerId ? `/obligations?${p.toString()}` : null, http.get);
  return { items: data?.items ?? [], isLoading };
}
