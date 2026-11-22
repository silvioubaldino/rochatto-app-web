"use client";

import { http } from "@/lib/http";
import { useApiMutation } from "@/lib/mutation";
import type {
  AllocationMethod,
  PendingSaleItemGroup,
  PurchaseCharge,
  PurchaseChargeKind,
  PurchaseDetail,
  PurchaseItem,
  PurchaseStatus,
  PurchaseStatusResponse,
} from "@/lib/types";

export function useSetPurchaseStatus() {
  return useApiMutation({
    run: (id: string, status: PurchaseStatus) =>
      http.patch<PurchaseStatusResponse>(`/purchases/${id}/status`, { status }),
    emits: "PURCHASE_CHANGED",
    errorFallback: "Erro ao atualizar a compra.",
  });
}

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

export function useAttachToPurchase() {
  return useApiMutation({
    run: (purchaseId: string, itemIds: readonly string[]) =>
      http.post<unknown>(`/purchases/${purchaseId}/sale-items`, { sale_item_ids: itemIds }),
    emits: ["PURCHASE_CHANGED", "SALE_CHANGED"],
    successMessage: "Itens adicionados à compra.",
    errorFallback: "Erro ao adicionar à compra.",
  });
}

export function queueItemIds(groups: readonly PendingSaleItemGroup[], supplierId: string): string[] {
  return groups.find((g) => g.supplier_id === supplierId)?.items.map((i) => i.id) ?? [];
}

export function useUpdatePurchase(purchase: Pick<PurchaseDetail, "id" | "expected_date" | "notes" | "allocation_method">) {
  return useApiMutation({
    run: (patch: Partial<Pick<PurchaseDetail, "expected_date" | "notes" | "allocation_method">>) => {
      const next = { ...purchase, ...patch };
      return http.put<unknown>(`/purchases/${purchase.id}`, {
        expected_date: next.expected_date ? next.expected_date.slice(0, 10) : null,
        notes: next.notes || null,
        allocation_method: next.allocation_method,
      });
    },
    emits: "PURCHASE_CHANGED",
    successMessage: "Compra atualizada.",
    errorFallback: "Erro ao salvar a compra.",
  });
}

export interface PurchaseChargePayload {
  kind: PurchaseChargeKind;
  amount: number;
  description: string | null;
  payee_supplier_id: string | null;
}

export function useSavePurchaseCharge(purchaseId: string, charge?: PurchaseCharge) {
  return useApiMutation({
    run: (payload: PurchaseChargePayload) =>
      charge
        ? http.put<PurchaseCharge>(`/purchases/${purchaseId}/charges/${charge.id}`, payload)
        : http.post<PurchaseCharge>(`/purchases/${purchaseId}/charges`, payload),
    emits: "PURCHASE_CHANGED",
    successMessage: charge ? "Custo adicional atualizado." : "Custo adicional lançado.",
    toastOnError: false,
  });
}

export function useDeletePurchaseCharge(purchaseId: string) {
  return useApiMutation({
    run: async (chargeId: string) => {
      await http.delete(`/purchases/${purchaseId}/charges/${chargeId}`);
      return true as const;
    },
    emits: "PURCHASE_CHANGED",
    errorFallback: "Erro ao remover o custo adicional.",
  });
}

export function useRestorePurchaseCharge(purchaseId: string) {
  return useApiMutation({
    run: (c: PurchaseCharge) =>
      http.post<PurchaseCharge>(`/purchases/${purchaseId}/charges`, {
        kind: c.kind,
        amount: c.amount,
        description: c.description,
        payee_supplier_id: c.payee_supplier_id,
      }),
    emits: "PURCHASE_CHANGED",
    errorFallback: "Não foi possível desfazer.",
  });
}

export function useDetachSaleItem(purchaseId: string) {
  return useApiMutation({
    run: async (saleItemId: string) => {
      await http.delete(`/purchases/${purchaseId}/sale-items/${saleItemId}`);
      return true as const;
    },
    emits: ["PURCHASE_CHANGED", "SALE_CHANGED"],
    errorFallback: "Erro ao remover o Item.",
  });
}

export interface PurchaseItemPayload {
  product_id: string;
  quantity: number;
  unit_cost: number;
}

export function useSavePurchaseItem(purchaseId: string, item?: PurchaseItem) {
  return useApiMutation({
    run: (payload: PurchaseItemPayload) =>
      item
        ? http.put<unknown>(`/purchases/${purchaseId}/items/${item.id}`, payload)
        : http.post<unknown>(`/purchases/${purchaseId}/items`, payload),
    emits: "PURCHASE_CHANGED",
    successMessage: item ? "Linha atualizada." : "Linha adicionada.",
    toastOnError: false,
  });
}

export function useDeletePurchaseItem(purchaseId: string) {
  return useApiMutation({
    run: async (itemId: string) => {
      await http.delete(`/purchases/${purchaseId}/items/${itemId}`);
      return true as const;
    },
    emits: "PURCHASE_CHANGED",
    errorFallback: "Erro ao remover a linha.",
  });
}

export function useRestorePurchaseItem(purchaseId: string) {
  return useApiMutation({
    run: (i: PurchaseItem) =>
      http.post<unknown>(`/purchases/${purchaseId}/items`, { product_id: i.product_id, quantity: i.quantity, unit_cost: i.unit_cost }),
    emits: "PURCHASE_CHANGED",
    errorFallback: "Não foi possível desfazer.",
  });
}

export function useDeletePurchase() {
  return useApiMutation({
    run: async (purchaseId: string) => {
      await http.delete(`/purchases/${purchaseId}`);
      return true as const;
    },
    emits: ["PURCHASE_CHANGED", "SALE_CHANGED"],
    successMessage: "Compra excluída. Os Items voltaram para a fila.",
    toastOnError: false,
  });
}

export interface ReplenishmentPayload {
  kind: "STOCK_REPLENISHMENT";
  supplier_id: string;
  allocation_method: AllocationMethod;
  expected_date: string | null;
  notes: string | null;
  sale_item_ids: string[];
  items: PurchaseItemPayload[];
}

export function useCreateReplenishment() {
  return useApiMutation({
    run: (payload: ReplenishmentPayload) => http.post<PurchaseDetail>("/purchases", payload),
    emits: ["PURCHASE_CHANGED", "STOCK_CHANGED"],
    successMessage: "Compra para estoque criada.",
    toastOnError: false,
  });
}
