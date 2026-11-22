"use client";

import { http } from "@/lib/http";
import { useApiMutation } from "@/lib/mutation";
import { diffLines, type ItemLine } from "@/components/entity/items-grid";
import { toSaleItemPayload, toSaleUpdatePayload, type SaleItemDraft } from "@/lib/sales";
import { toSaleCostPayload, type toSaleChargePayload } from "@/lib/schemas";
import type {
  BatchFulfillmentItem,
  BatchFulfillmentResponse,
  ItemVendaWriteResponse,
  SaleCharge,
  SaleCost,
  SaleDeliveryStatus,
  SaleItemWarning,
  Venda,
} from "@/lib/types";

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

export function useBatchFulfillment(saleId: string) {
  return useApiMutation({
    run: (items: BatchFulfillmentItem[]) =>
      http.patch<BatchFulfillmentResponse>(`/vendas/${saleId}/itens/fulfillment`, { items }),
    emits: ["SALE_CHANGED", "PURCHASE_CHANGED"],
    successMessage: "Atendimento definido.",
    toastOnError: false,
  });
}

export { useSetInstallments } from "@/features/finance/mutations";

type ChargePayload = ReturnType<typeof toSaleChargePayload>;
type CostPayload = ReturnType<typeof toSaleCostPayload>;

export function useSaveSaleCharge(saleId: string, charge?: SaleCharge) {
  return useApiMutation({
    run: (payload: ChargePayload) =>
      charge ? http.put<SaleCharge>(`/vendas/${saleId}/charges/${charge.id}`, payload) : http.post<SaleCharge>(`/vendas/${saleId}/charges`, payload),
    emits: "SALE_CHANGED",
    successMessage: charge ? "Cobrança atualizada." : "Cobrança lançada.",
    toastOnError: false,
  });
}

export function useDeleteSaleCharge(saleId: string) {
  return useApiMutation({
    run: async (chargeId: string) => {
      await http.delete(`/vendas/${saleId}/charges/${chargeId}`);
      return true as const;
    },
    emits: "SALE_CHANGED",
    errorFallback: "Erro ao remover a cobrança.",
  });
}

export function useRestoreSaleCharge(saleId: string) {
  return useApiMutation({
    run: (c: SaleCharge) => http.post<SaleCharge>(`/vendas/${saleId}/charges`, { kind: c.kind, amount: c.amount, description: c.description }),
    emits: "SALE_CHANGED",
    errorFallback: "Não foi possível desfazer.",
  });
}

export function useSaveSaleCost(saleId: string, cost?: SaleCost) {
  return useApiMutation({
    run: (payload: CostPayload) =>
      cost ? http.put<SaleCost>(`/vendas/${saleId}/costs/${cost.id}`, payload) : http.post<SaleCost>(`/vendas/${saleId}/costs`, payload),
    emits: ["SALE_CHANGED", "MONEY_MOVED"],
    successMessage: cost ? "Custo atualizado." : "Custo lançado.",
    toastOnError: false,
  });
}

export function useDeleteSaleCost(saleId: string) {
  return useApiMutation({
    run: async (costId: string) => {
      await http.delete(`/vendas/${saleId}/costs/${costId}`);
      return true as const;
    },
    emits: ["SALE_CHANGED", "MONEY_MOVED"],
    errorFallback: "Erro ao remover o custo.",
  });
}

export function useRestoreSaleCost(saleId: string) {
  return useApiMutation({
    run: (c: SaleCost) =>
      http.post<SaleCost>(`/vendas/${saleId}/costs`, toSaleCostPayload(
        { kind: c.kind, amount: c.amount, description: c.description ?? "", payee_id: c.payee?.id ?? "" },
        c.sale_item_id,
      )),
    emits: ["SALE_CHANGED", "MONEY_MOVED"],
    errorFallback: "Não foi possível desfazer.",
  });
}
