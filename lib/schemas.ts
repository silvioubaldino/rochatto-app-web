import { z } from "zod";

// Schemas zod dos cadastros comerciais (AYD-003@context). Espelham as validações da API
// para validar no cliente antes de enviar; a API continua sendo a fonte da verdade.

/** Converte "" (valor vazio de input/select) em null — a API espera uuid|null, nunca "". */
export function emptyToNull(value: string | null | undefined): string | null {
  const v = value?.trim();
  return v ? v : null;
}

// --- Partner ---------------------------------------------------------------

export const partnerSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório"),
  // Entrada string (select começa vazio) → saída PartnerType; "" falha com a mensagem.
  type: z.string().pipe(
    z.enum(["ARCHITECT", "ENGINEER", "BUILDER", "OTHER"], { error: "Tipo é obrigatório" }),
  ),
  phone: z.string(),
  notes: z.string(),
});

export type PartnerFormInput = z.input<typeof partnerSchema>;
export type PartnerFormData = z.output<typeof partnerSchema>;

/** Body de POST/PUT /partners. */
export function toPartnerPayload(data: PartnerFormData) {
  return {
    name: data.name.trim(),
    type: data.type,
    phone: emptyToNull(data.phone),
    notes: emptyToNull(data.notes),
  };
}

// --- Customer (lead source) -------------------------------------------------

export const clienteSchema = z
  .object({
    nome: z.string().min(1, "Nome é obrigatório").max(200, "Máximo 200 caracteres"),
    telefone: z.string(),
    email: z.string().email("E-mail inválido").or(z.literal("")),
    endereco: z.string(),
    cidade: z.string(),
    observacoes: z.string(),
    // "" = origem não informada (enviada como null)
    lead_source: z.enum(["REFERRAL", "INSTAGRAM", "PARTNER", "OTHER"]).or(z.literal("")),
    referrer_id: z.string(),
  })
  .superRefine((data, ctx) => {
    // Mesma regra da API: referrer_id obrigatório se, e somente se, lead_source = PARTNER.
    if (data.lead_source === "PARTNER" && !data.referrer_id) {
      ctx.addIssue({
        code: "custom",
        path: ["referrer_id"],
        message: "Selecione o parceiro que indicou o cliente",
      });
    }
    if (data.lead_source !== "PARTNER" && data.referrer_id) {
      ctx.addIssue({
        code: "custom",
        path: ["referrer_id"],
        message: "Parceiro só pode ser informado quando a origem é Parceiro",
      });
    }
  });

export type ClienteFormData = z.infer<typeof clienteSchema>;

/** Body de POST/PUT /clientes. */
export function toClientePayload(data: ClienteFormData) {
  const leadSource = data.lead_source || null;
  return {
    ...data,
    lead_source: leadSource,
    referrer_id: leadSource === "PARTNER" ? emptyToNull(data.referrer_id) : null,
  };
}

// --- Product category -------------------------------------------------------

export const productCategorySchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório"),
});

export type ProductCategoryFormData = z.infer<typeof productCategorySchema>;

// --- AYD-002: Purchase, Supplier payment e Stock adjustment -----------------

/** "1,5" / "1.5" → 1.5; vazio ou inválido → NaN. */
export function parseDecimal(value: string | number | null | undefined): number {
  if (typeof value === "number") return value;
  const v = (value ?? "").trim().replace(/\s/g, "").replace(",", ".");
  if (!v) return NaN;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

const positiveQuantity = z
  .string()
  .transform(parseDecimal)
  .pipe(
    z
      .number({ error: "Informe a quantidade" })
      .refine((v) => v > 0, "Quantidade deve ser maior que zero"),
  );

const nonNegativeMoney = z.number().min(0, "Valor não pode ser negativo");

/** Linha de reposição (POST/PUT /purchases/{id}/items e `items` do POST /purchases). */
export const purchaseItemSchema = z.object({
  product_id: z.string().min(1, "Selecione o produto"),
  quantity: positiveQuantity,
  unit_cost: nonNegativeMoney,
});

export type PurchaseItemFormInput = z.input<typeof purchaseItemSchema>;
export type PurchaseItemFormData = z.output<typeof purchaseItemSchema>;

/** Purchase STOCK_REPLENISHMENT nova (POST /purchases). */
export const replenishmentPurchaseSchema = z.object({
  supplier_id: z.string().min(1, "Selecione o fornecedor"),
  expected_date: z.string(),
  notes: z.string(),
  items: z.array(purchaseItemSchema).min(1, "Adicione ao menos um produto"),
});

export type ReplenishmentPurchaseFormInput = z.input<typeof replenishmentPurchaseSchema>;
export type ReplenishmentPurchaseFormData = z.output<typeof replenishmentPurchaseSchema>;

export function toReplenishmentPurchasePayload(data: ReplenishmentPurchaseFormData) {
  return {
    kind: "STOCK_REPLENISHMENT" as const,
    supplier_id: data.supplier_id,
    expected_date: emptyToNull(data.expected_date),
    notes: emptyToNull(data.notes),
    sale_item_ids: [] as string[],
    items: data.items.map((i) => ({
      product_id: i.product_id,
      quantity: i.quantity,
      unit_cost: i.unit_cost,
    })),
  };
}

/** PUT /purchases/{id} — só expected_date e notes. */
export const purchaseHeaderSchema = z.object({
  expected_date: z.string(),
  notes: z.string(),
});

export type PurchaseHeaderFormData = z.infer<typeof purchaseHeaderSchema>;

export function toPurchaseHeaderPayload(data: PurchaseHeaderFormData) {
  return {
    expected_date: emptyToNull(data.expected_date),
    notes: emptyToNull(data.notes),
  };
}

/** PATCH /purchases/{id}/payment com PAID. */
export const supplierPaymentSchema = z.object({
  paid_amount: nonNegativeMoney,
  paid_at: z.string().min(1, "Informe a data do pagamento"),
});

export type SupplierPaymentFormData = z.infer<typeof supplierPaymentSchema>;

/** POST /stock/adjustments — quantidade ± (≠ 0), custo opcional. */
export const stockAdjustmentSchema = z.object({
  product_id: z.string().min(1, "Selecione o produto"),
  quantity: z
    .string()
    .transform(parseDecimal)
    .pipe(
      z
        .number({ error: "Informe a quantidade (use − para baixar)" })
        .refine((v) => v !== 0, "A quantidade não pode ser zero"),
    ),
  unit_cost: z
    .string()
    .transform((v) => (v.trim() ? parseDecimal(v) : null))
    .pipe(
      z
        .number({ error: "Custo inválido" })
        .refine((v) => v >= 0, "Custo não pode ser negativo")
        .nullable(),
    ),
  reason: z.string().pipe(z.enum(["INITIAL", "COUNT", "OTHER"], { error: "Motivo é obrigatório" })),
  adjusted_at: z.string().min(1, "Informe a data"),
  notes: z.string(),
});

export type StockAdjustmentFormInput = z.input<typeof stockAdjustmentSchema>;
export type StockAdjustmentFormData = z.output<typeof stockAdjustmentSchema>;

export function toStockAdjustmentPayload(data: StockAdjustmentFormData) {
  return {
    product_id: data.product_id,
    quantity: data.quantity,
    unit_cost: data.unit_cost,
    reason: data.reason,
    adjusted_at: data.adjusted_at,
    notes: emptyToNull(data.notes),
  };
}
