"use client";

import { diffLines, type ItemLine } from "@/components/entity/items-grid";
import { http } from "@/lib/http";
import { useApiMutation } from "@/lib/mutation";
import type { ClosingRequest, ClosingResponse, Quote, QuoteStatus } from "@/lib/types";
import {
  toQuoteCreatePayload,
  toQuoteHeaderPayload,
  toQuoteItemPayload,
  type QuoteFormData,
} from "./schemas";

export function useCreateQuote() {
  return useApiMutation({
    run: (form: QuoteFormData) => http.post<Quote>("/quotes", toQuoteCreatePayload(form)),
    emits: "QUOTE_CHANGED",
    successMessage: "Orçamento criado.",
    errorFallback: "Erro ao criar orçamento.",
  });
}

/**
 * Salva o orçamento aberto: cabeçalho (C2) + diferença de Items. A api não tem "salvar tudo",
 * então vai em ordem — cabeçalho, remoções, alterações, criações — e para no primeiro erro.
 */
export function useSaveQuote(quoteId: string, original: readonly ItemLine[]) {
  return useApiMutation({
    run: async (form: QuoteFormData) => {
      await http.put(`/quotes/${quoteId}`, toQuoteHeaderPayload(form));
      const diff = diffLines(original, form.items);
      for (const id of diff.remove) await http.delete(`/quotes/${quoteId}/items/${id}`);
      for (const l of diff.update) await http.put(`/quotes/${quoteId}/items/${l.id}`, toQuoteItemPayload(l));
      for (const l of diff.create) await http.post(`/quotes/${quoteId}/items`, toQuoteItemPayload(l));
      return true as const;
    },
    emits: "QUOTE_CHANGED",
    successMessage: "Orçamento salvo.",
    errorFallback: "Erro ao salvar orçamento.",
  });
}

export function useSetQuoteStatus(quoteId: string) {
  return useApiMutation({
    run: async (status: QuoteStatus, lostReason?: string) => {
      await http.patch<unknown>(`/quotes/${quoteId}/status`, { status, lost_reason: lostReason?.trim() || undefined });
      return true as const;
    },
    emits: "QUOTE_CHANGED",
    errorFallback: "Erro ao atualizar o orçamento.",
  });
}

export function useDeleteQuote(quoteId: string) {
  return useApiMutation({
    run: async () => {
      await http.delete(`/quotes/${quoteId}`);
      return true as const;
    },
    emits: "QUOTE_CHANGED",
    successMessage: "Orçamento excluído.",
    errorFallback: "Erro ao excluir orçamento.",
  });
}

const CLOSING_EMITS = ["QUOTE_CHANGED", "SALE_CHANGED", "PURCHASE_CHANGED", "MONEY_MOVED"] as const;

export function useConvertQuote(quoteId: string) {
  return useApiMutation({
    run: (closing: ClosingRequest) => http.post<ClosingResponse>(`/quotes/${quoteId}/convert`, { closing }),
    emits: CLOSING_EMITS,
    successMessage: (r) => (r.sale_number ? `Venda nº ${r.sale_number} fechada.` : "Venda fechada."),
    toastOnError: false,
  });
}

export function useQuickSale() {
  return useApiMutation({
    run: (form: QuoteFormData, closing: ClosingRequest) =>
      http.post<ClosingResponse>("/quotes/quick-sale", { ...toQuoteCreatePayload(form), closing }),
    emits: CLOSING_EMITS,
    successMessage: (r) => (r.sale_number ? `Venda nº ${r.sale_number} fechada.` : "Venda fechada."),
    toastOnError: false,
  });
}

export function useDuplicateQuote() {
  return useApiMutation({
    run: (form: QuoteFormData, today: string) => http.post<Quote>("/quotes", toQuoteCreatePayload({ ...form, quote_date: today })),
    emits: "QUOTE_CHANGED",
    successMessage: "Orçamento duplicado.",
    errorFallback: "Erro ao duplicar orçamento.",
  });
}
