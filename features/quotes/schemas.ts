import { z } from "zod";
import type { ItemLine } from "@/components/entity/items-grid";
import type { Quote, SaleChargeKind } from "@/lib/types";

const lineSchema = z.object({
  key: z.string(),
  id: z.string().optional(),
  kind: z.enum(["PRODUCT", "SERVICE"]),
  productId: z.string().nullable(),
  serviceId: z.string().nullable(),
  name: z.string().trim().min(1, "Informe o produto ou serviço."),
  unit: z.string().nullable(),
  quantity: z.number().min(0.01, "A quantidade deve ser maior que zero."),
  unitPrice: z.number().min(0, "Preço inválido."),
  unitCost: z.number().min(0, "Custo inválido."),
});

export const quoteChargeSchema = z.object({
  id: z.string().optional(),
  kind: z.enum(["FREIGHT", "OTHER"]),
  amount: z.number().min(0),
  description: z.string(),
});

export const quoteFormSchema = z.object({
  customer_id: z.string().min(1, "Cliente é obrigatório"),
  quote_date: z.string().min(1, "Data é obrigatória"),
  referrer_id: z.string(),
  notes: z.string(),
  items: z.array(lineSchema).min(1, "Adicione pelo menos um item"),
  charges: z.array(quoteChargeSchema),
});

export type QuoteFormData = z.infer<typeof quoteFormSchema>;
export type ChargeDraft = z.infer<typeof quoteChargeSchema>;

export function emptyQuoteForm(today: string, customerId = ""): QuoteFormData {
  return { customer_id: customerId, quote_date: today, referrer_id: "", notes: "", items: [], charges: [] };
}

export function formFromQuote(quote: Quote, lines: ItemLine[]): QuoteFormData {
  return {
    customer_id: quote.customer_id,
    quote_date: quote.quote_date.slice(0, 10),
    referrer_id: quote.referrer_id ?? "",
    notes: quote.notes ?? "",
    items: lines,
    charges: (quote.charges ?? []).map((c) => ({
      id: c.id,
      kind: c.kind,
      amount: c.amount,
      description: c.description ?? "",
    })),
  };
}

export function toQuoteItemPayload(l: ItemLine) {
  const service = l.kind === "SERVICE";
  return {
    kind: l.kind,
    product_id: service ? null : l.productId || null,
    service_id: service ? l.serviceId || null : null,
    product_name: l.name.trim(),
    quantity: l.quantity,
    unit_price: l.unitPrice,
    unit_cost: l.unitCost,
  };
}

export function toQuoteChargesPayload(charges: readonly ChargeDraft[]) {
  return charges
    .filter((c) => c.amount > 0)
    .map((c) => ({
      ...(c.id ? { id: c.id } : {}),
      kind: c.kind as SaleChargeKind,
      amount: c.amount,
      description: c.description.trim() || null,
    }));
}

export function toQuoteCreatePayload(form: QuoteFormData) {
  return {
    customer_id: form.customer_id,
    quote_date: form.quote_date,
    referrer_id: form.referrer_id || null,
    notes: form.notes.trim() || null,
    charges: toQuoteChargesPayload(form.charges),
    items: form.items.map(toQuoteItemPayload),
  };
}

export function toQuoteHeaderPayload(form: QuoteFormData) {
  return {
    customer_id: form.customer_id,
    quote_date: form.quote_date,
    referrer_id: form.referrer_id || null,
    notes: form.notes.trim() || null,
    charges: toQuoteChargesPayload(form.charges),
  };
}
