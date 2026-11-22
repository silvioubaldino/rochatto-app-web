import { z } from "zod";
import { emptyToNull } from "@/lib/schemas";
import type { PurchaseChargePayload, PurchaseItemPayload, ReplenishmentPayload } from "./mutations";

const money = z.number({ error: "Informe o valor" });

export const purchaseItemSchema = z.object({
  product_id: z.string().min(1, "Selecione o produto"),
  quantity: z.number({ error: "Informe a quantidade" }).gt(0, "Quantidade deve ser maior que zero"),
  unit_cost: money.min(0, "Valor não pode ser negativo"),
});
export type PurchaseItemFormData = z.infer<typeof purchaseItemSchema>;

export const toPurchaseItemPayload = (d: PurchaseItemFormData): PurchaseItemPayload => ({ product_id: d.product_id, quantity: d.quantity, unit_cost: d.unit_cost });

export const replenishmentSchema = z.object({
  supplier_id: z.string().min(1, "Selecione o fornecedor"),
  expected_date: z.string(),
  notes: z.string(),
  allocation_method: z.enum(["BY_QUANTITY", "BY_VALUE"]),
  items: z.array(purchaseItemSchema).min(1, "Adicione ao menos um produto"),
});
export type ReplenishmentFormData = z.infer<typeof replenishmentSchema>;

export function toReplenishmentPayload(d: ReplenishmentFormData): ReplenishmentPayload {
  return {
    kind: "STOCK_REPLENISHMENT",
    supplier_id: d.supplier_id,
    allocation_method: d.allocation_method,
    expected_date: emptyToNull(d.expected_date),
    notes: emptyToNull(d.notes),
    sale_item_ids: [],
    items: d.items.map(toPurchaseItemPayload),
  };
}

export const purchaseChargeSchema = z.object({
  kind: z.enum(["FREIGHT", "UNLOADING", "TAX", "OTHER"]),
  amount: money.gt(0, "Valor deve ser maior que zero"),
  description: z.string(),
  payee_supplier_id: z.string(),
});
export type PurchaseChargeFormData = z.infer<typeof purchaseChargeSchema>;

export const toPurchaseChargePayload = (d: PurchaseChargeFormData): PurchaseChargePayload => ({
  kind: d.kind,
  amount: d.amount,
  description: emptyToNull(d.description),
  payee_supplier_id: emptyToNull(d.payee_supplier_id),
});

export const purchaseHeaderSchema = z.object({ expected_date: z.string(), notes: z.string() });
export type PurchaseHeaderFormData = z.infer<typeof purchaseHeaderSchema>;
