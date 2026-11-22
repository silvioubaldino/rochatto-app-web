"use client";

import { http } from "@/lib/http";
import { useApiMutation } from "@/lib/mutation";
import type { PendingSaleItemGroup, PurchaseDetail, PurchaseStatus, PurchaseStatusResponse } from "@/lib/types";

/** Marca a compra como pedida/recebida (PATCH /purchases/{id}/status). */
export function useSetPurchaseStatus() {
  return useApiMutation({
    run: (id: string, status: PurchaseStatus) =>
      http.patch<PurchaseStatusResponse>(`/purchases/${id}/status`, { status }),
    emits: "PURCHASE_CHANGED",
    errorFallback: "Erro ao atualizar a compra.",
  });
}

/**
 * Gera UMA compra (sob encomenda) para o fornecedor com os Items indicados
 * (`POST /purchases`); sem `itemIds`, os Items de TODA a fila do fornecedor.
 */
export function useGeneratePurchase() {
  return useApiMutation({
    run: async (supplierId: string, itemIds: readonly string[]) =>
      http.post<PurchaseDetail>("/purchases", {
        kind: "MADE_TO_ORDER",
        supplier_id: supplierId,
        expected_date: null,
        notes: null,
        sale_item_ids: itemIds,
        items: [],
      }),
    emits: ["PURCHASE_CHANGED", "SALE_CHANGED"],
    successMessage: "Compra criada.",
    errorFallback: "Erro ao criar a compra.",
  });
}

/** Anexa Items a uma compra aberta do mesmo fornecedor (`POST /purchases/{id}/sale-items`). */
export function useAttachToPurchase() {
  return useApiMutation({
    run: (purchaseId: string, itemIds: readonly string[]) =>
      http.post<unknown>(`/purchases/${purchaseId}/sale-items`, { sale_item_ids: itemIds }),
    emits: ["PURCHASE_CHANGED", "SALE_CHANGED"],
    successMessage: "Itens adicionados à compra.",
    errorFallback: "Erro ao adicionar à compra.",
  });
}

/** Ids dos Items da fila de um fornecedor. */
export function queueItemIds(groups: readonly PendingSaleItemGroup[], supplierId: string): string[] {
  return groups.find((g) => g.supplier_id === supplierId)?.items.map((i) => i.id) ?? [];
}
