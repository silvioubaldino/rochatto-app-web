"use client";

import { http } from "@/lib/http";
import { useApiMutation } from "@/lib/mutation";
import { diffLines, type ItemLine } from "@/components/entity/items-grid";
import { toInstallmentsPayload, type PlanLine } from "@/components/entity/installment-plan";
import { toSaleItemPayload, toSaleUpdatePayload, type SaleItemDraft } from "@/lib/sales";
import type {
  BatchFulfillmentItem,
  BatchFulfillmentResponse,
  ItemVendaWriteResponse,
  SaleDeliveryStatus,
  SaleItemWarning,
  Venda,
} from "@/lib/types";

/** Status de entrega da Sale (manual) — PATCH /vendas/{id}/delivery-status. */
export function useSetDelivery() {
  return useApiMutation({
    run: async (saleId: string, status: SaleDeliveryStatus) => {
      await http.patch<unknown>(`/vendas/${saleId}/delivery-status`, { delivery_status: status });
      return true as const;
    },
    emits: "SALE_CHANGED",
    errorFallback: "Erro ao atualizar a entrega.",
  });
}

/** Cancelar a venda (terminal): a regra RN-15 volta como 409 no diálogo. */
export function useCancelSale() {
  return useApiMutation({
    run: async (saleId: string) => {
      await http.patch<unknown>(`/vendas/${saleId}/delivery-status`, { delivery_status: "CANCELED" });
      return true as const;
    },
    emits: "SALE_CHANGED",
    successMessage: "Venda cancelada.",
    toastOnError: false,
  });
}

/** Prazo de entrega e observações (PUT /vendas/{id}: substituição completa, via `toSaleUpdatePayload`). */
export function useUpdateSale() {
  return useApiMutation({
    run: async (sale: Venda, overrides: { data_entrega_prevista: string | null; observacoes: string | null }) => {
      await http.put(`/vendas/${sale.id}`, toSaleUpdatePayload(sale, overrides));
      return true as const;
    },
    emits: "SALE_CHANGED",
    successMessage: "Venda atualizada.",
    errorFallback: "Erro ao salvar a venda.",
  });
}

function draftOf(l: ItemLine): SaleItemDraft {
  return {
    produto_id: l.productId,
    produto_nome: l.name,
    fornecedor_id: l.supplierId ?? null,
    fornecedor_nome: l.supplierName ?? null,
    quantidade: l.quantity,
    preco_venda_unit: l.unitPrice,
    custo_unit: l.unitCost,
    origin: l.origin ?? "MADE_TO_ORDER",
    kind: l.kind,
    service_id: l.serviceId,
  };
}

/**
 * Grava a diferença dos Items da venda (a api não tem "salvar tudo"): remoções, alterações e
 * criações, em ordem. Devolve os avisos de estoque (`INSUFFICIENT_STOCK`) das gravações.
 */
export function useSaveSaleItems(saleId: string, original: readonly ItemLine[]) {
  return useApiMutation({
    run: async (drafts: readonly ItemLine[]) => {
      const diff = diffLines(original, drafts);
      const warnings: SaleItemWarning[] = [];
      for (const id of diff.remove) await http.delete(`/vendas/${saleId}/itens/${id}`);
      for (const l of diff.update) {
        const res = await http.put<ItemVendaWriteResponse>(`/vendas/${saleId}/itens/${l.id}`, toSaleItemPayload(draftOf(l)));
        warnings.push(...(res?.warnings ?? []));
      }
      for (const l of diff.create) {
        const res = await http.post<ItemVendaWriteResponse>(`/vendas/${saleId}/itens`, toSaleItemPayload(draftOf(l)));
        warnings.push(...(res?.warnings ?? []));
      }
      return warnings;
    },
    emits: "SALE_CHANGED",
    successMessage: "Items atualizados.",
    errorFallback: "Erro ao salvar os items.",
  });
}

/** Atendimento em lote (C6): origem e fornecedor de 1..50 Items, tudo ou nada. Erro fica no diálogo. */
export function useBatchFulfillment(saleId: string) {
  return useApiMutation({
    run: (items: BatchFulfillmentItem[]) =>
      http.patch<BatchFulfillmentResponse>(`/vendas/${saleId}/itens/fulfillment`, { items }),
    emits: ["SALE_CHANGED", "PURCHASE_CHANGED"],
    successMessage: "Atendimento definido.",
    toastOnError: false,
  });
}

/** Plano de recebimento da conta a receber (PUT /obligations/{id}/installments). */
export function useSetInstallments() {
  return useApiMutation({
    run: async (obligationId: string, lines: readonly PlanLine[]) => {
      await http.put(`/obligations/${obligationId}/installments`, { installments: toInstallmentsPayload(lines) });
      return true as const;
    },
    emits: "MONEY_MOVED",
    successMessage: "Plano de recebimento salvo.",
    toastOnError: false,
  });
}
