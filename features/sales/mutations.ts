"use client";

import { http } from "@/lib/http";
import { useApiMutation } from "@/lib/mutation";
import type { SaleDeliveryStatus } from "@/lib/types";

/** Status de entrega da Sale (manual) — PATCH /vendas/{id}/delivery-status. */
export function useSetDelivery() {
  return useApiMutation({
    run: (saleId: string, status: SaleDeliveryStatus) =>
      http.patch<unknown>(`/vendas/${saleId}/delivery-status`, { delivery_status: status }),
    emits: "SALE_CHANGED",
    errorFallback: "Erro ao atualizar a entrega.",
  });
}
