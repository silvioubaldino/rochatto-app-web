import { z } from "zod";
import type { InstallmentInput, MovementCategory, Obligation, PaymentMethod } from "./types";
import { isInflowCategory } from "./formatters";

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
  allocation_method: z.enum(["BY_QUANTITY", "BY_VALUE"]),
  items: z.array(purchaseItemSchema).min(1, "Adicione ao menos um produto"),
});

export type ReplenishmentPurchaseFormInput = z.input<typeof replenishmentPurchaseSchema>;
export type ReplenishmentPurchaseFormData = z.output<typeof replenishmentPurchaseSchema>;

export function toReplenishmentPurchasePayload(data: ReplenishmentPurchaseFormData) {
  return {
    kind: "STOCK_REPLENISHMENT" as const,
    supplier_id: data.supplier_id,
    allocation_method: data.allocation_method,
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

export const purchaseChargeSchema = z.object({
  kind: z.enum(["FREIGHT", "UNLOADING", "TAX", "OTHER"]),
  amount: z.number({ error: "Informe o valor" }).gt(0, "Valor deve ser maior que zero"),
  description: z.string(),
  payee_supplier_id: z.string(),
});

export type PurchaseChargeFormData = z.infer<typeof purchaseChargeSchema>;

export function toPurchaseChargePayload(data: PurchaseChargeFormData) {
  return {
    kind: data.kind,
    amount: data.amount,
    description: emptyToNull(data.description),
    payee_supplier_id: emptyToNull(data.payee_supplier_id),
  };
}

/** PUT /purchases/{id} — só expected_date e notes. */
export const purchaseHeaderSchema = z.object({
  expected_date: z.string(),
  notes: z.string(),
});

export type PurchaseHeaderFormData = z.infer<typeof purchaseHeaderSchema>;

export function toPurchaseHeaderPayload(
  data: PurchaseHeaderFormData,
  allocationMethod?: "BY_QUANTITY" | "BY_VALUE",
) {
  return {
    expected_date: emptyToNull(data.expected_date),
    notes: emptyToNull(data.notes),
    ...(allocationMethod ? { allocation_method: allocationMethod } : {}),
  };
}

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

// --- Contas e movimentações (AYD-007) ----------------------------------------

const PAYMENT_METHOD_VALUES = ["PIX", "CASH", "CARD", "BOLETO", "TRANSFER"] as const;
const MOVEMENT_CATEGORY_VALUES = [
  "SALE_RECEIPT",
  "OTHER_INCOME",
  "PURCHASE_PAYMENT",
  "FREIGHT",
  "LABOR",
  "COMMISSION",
  "VEHICLE",
  "TAXES",
  "FIXED_COSTS",
  "MARKETING",
  "BANK_FEES",
  "OTHER_EXPENSE",
] as const;

const positiveMoney = z.number().min(0.01, "Valor deve ser maior que zero");
const requiredDate = z.string().min(1, "Informe a data");
// "" = valor vazio do select; nas formas obrigatórias a mensagem explica
const requiredMethod = z
  .string()
  .pipe(z.enum(PAYMENT_METHOD_VALUES, { error: "Forma de pagamento é obrigatória" }));
const optionalMethod = z.enum(["", ...PAYMENT_METHOD_VALUES]);

/** Pagar / Receber uma conta: `POST /obligations/{id}/settle`. */
export const settleSchema = z.object({
  amount: positiveMoney,
  occurred_on: requiredDate,
  payment_method: requiredMethod,
});

export type SettleFormInput = z.input<typeof settleSchema>;
export type SettleFormData = z.output<typeof settleSchema>;

export function toSettlePayload(data: SettleFormData) {
  return {
    amount: data.amount,
    movement: { occurred_on: data.occurred_on, payment_method: data.payment_method },
  };
}

/** Pagar várias contas com uma movimentação: `POST /settlements`. */
export const bulkSettleSchema = z.object({
  occurred_on: requiredDate,
  payment_method: requiredMethod,
  allocations: z
    .array(
      z.object({
        obligation_id: z.string().min(1),
        amount: positiveMoney,
      }),
    )
    .min(1, "Selecione ao menos uma conta"),
});

export type BulkSettleFormInput = z.input<typeof bulkSettleSchema>;
export type BulkSettleFormData = z.output<typeof bulkSettleSchema>;

export function toBulkSettlePayload(data: BulkSettleFormData) {
  return {
    movement: { occurred_on: data.occurred_on, payment_method: data.payment_method },
    allocations: data.allocations.map((a) => ({ obligation_id: a.obligation_id, amount: a.amount })),
  };
}

/** Plano de parcelas: `PUT /obligations/{id}/installments`. */
export const installmentsSchema = z.object({
  installments: z.array(
    z.object({
      due_date: z.string().min(1, "Informe o vencimento"),
      amount: positiveMoney,
      payment_method: optionalMethod,
      notes: z.string(),
    }),
  ),
});

export type InstallmentsFormInput = z.input<typeof installmentsSchema>;
export type InstallmentsFormData = z.output<typeof installmentsSchema>;

export function toInstallmentsPayload(data: InstallmentsFormData): { installments: InstallmentInput[] } {
  return {
    installments: data.installments.map((i) => ({
      due_date: i.due_date,
      amount: i.amount,
      ...(i.payment_method ? { payment_method: i.payment_method as PaymentMethod } : {}),
      ...(i.notes.trim() ? { notes: i.notes.trim() } : {}),
    })),
  };
}

const wholeNumber = (min: number, max: number | null, empty: string, range: string) =>
  z
    .string()
    .transform(parseDecimal)
    .pipe(
      z
        .number({ error: empty })
        .refine((v) => Number.isInteger(v) && v >= min && (max === null || v <= max), range),
    );

/** Gerar parcelas iguais: `POST /obligations/{id}/installments/generate`. */
export const generateInstallmentsSchema = z.object({
  count: wholeNumber(2, 24, "Informe o número de parcelas", "Use de 2 a 24 parcelas"),
  first_due_date: requiredDate,
  // vazio = padrão da API (1 mês)
  interval_months: z
    .string()
    .transform((v) => (v.trim() ? parseDecimal(v) : null))
    .pipe(
      z
        .number({ error: "Intervalo inválido" })
        .refine((v) => Number.isInteger(v) && v >= 1, "Intervalo deve ser de 1 mês ou mais")
        .nullable(),
    ),
  // 0 = padrão da API (o que está em aberto)
  amount: z.number().min(0, "Valor não pode ser negativo"),
});

export type GenerateInstallmentsFormInput = z.input<typeof generateInstallmentsSchema>;
export type GenerateInstallmentsFormData = z.output<typeof generateInstallmentsSchema>;

export function toGenerateInstallmentsPayload(data: GenerateInstallmentsFormData) {
  return {
    count: data.count,
    first_due_date: data.first_due_date,
    ...(data.interval_months !== null ? { interval_months: data.interval_months } : {}),
    ...(data.amount > 0 ? { amount: data.amount } : {}),
  };
}

/** Prazo e observações da conta: `PATCH /obligations/{id}`. */
export const obligationPatchSchema = z.object({
  due_date: z.string(),
  notes: z.string(),
});

export type ObligationPatchFormData = z.infer<typeof obligationPatchSchema>;

/** Só os campos alterados; `null` limpa o prazo/observações. Vazio = nada a enviar. */
export function toObligationPatchPayload(
  data: ObligationPatchFormData,
  original: Pick<Obligation, "due_date" | "notes">,
): { due_date?: string | null; notes?: string | null } {
  const payload: { due_date?: string | null; notes?: string | null } = {};
  const dueDate = emptyToNull(data.due_date);
  const notes = emptyToNull(data.notes);
  if (dueDate !== (original.due_date ? original.due_date.slice(0, 10) : null)) payload.due_date = dueDate;
  if (notes !== (original.notes ?? null)) payload.notes = notes;
  return payload;
}

/** Movimentação avulsa (despesa ou OTHER_INCOME) e sua correção. O valor é digitado sem sinal. */
export const movementSchema = z.object({
  category: z.string().pipe(z.enum(MOVEMENT_CATEGORY_VALUES, { error: "Categoria é obrigatória" })),
  amount: positiveMoney,
  occurred_on: requiredDate,
  payment_method: optionalMethod,
  counterparty_name: z.string(),
  description: z.string(),
});

export type MovementFormInput = z.input<typeof movementSchema>;
export type MovementFormData = z.output<typeof movementSchema>;

/** Sinal exigido pela categoria: entrada > 0, saída < 0 (AYD-007). */
export function signedMovementAmount(category: MovementCategory, magnitude: number): number {
  return isInflowCategory(category) ? Math.abs(magnitude) : -Math.abs(magnitude);
}

/** Corpo de POST e PUT /financial-movements (o PUT usa o mesmo corpo do POST). */
export function toMovementPayload(data: MovementFormData) {
  const category = data.category as MovementCategory;
  return {
    occurred_on: data.occurred_on,
    amount: signedMovementAmount(category, data.amount),
    category,
    payment_method: data.payment_method === "" ? null : data.payment_method,
    counterparty_name: emptyToNull(data.counterparty_name),
    description: emptyToNull(data.description),
  };
}

// --- Composição da venda (AYD-009) -------------------------------------------

export const saleChargeSchema = z.object({
  kind: z.enum(["FREIGHT", "OTHER"]),
  amount: z.number({ error: "Informe o valor" }).gt(0, "Valor deve ser maior que zero"),
  description: z.string(),
});

export type SaleChargeFormData = z.infer<typeof saleChargeSchema>;

/** Body de POST/PUT /vendas/{id}/charges e item de `charges` do Quote. */
export function toSaleChargePayload(data: SaleChargeFormData) {
  return { kind: data.kind, amount: data.amount, description: emptyToNull(data.description) };
}

export const saleCostSchema = z.object({
  kind: z.enum(["FREIGHT", "LABOR", "COMMISSION", "OTHER"]),
  amount: z.number({ error: "Informe o valor" }).min(0, "Valor não pode ser negativo"),
  description: z.string(),
  /** Supplier (FREIGHT, LABOR, OTHER) ou Partner (COMMISSION); "" = a definir. */
  payee_id: z.string(),
});

export type SaleCostFormData = z.infer<typeof saleCostSchema>;

/** Body de POST/PUT /vendas/{id}/costs: COMMISSION → payee_partner_id; demais → payee_supplier_id. */
export function toSaleCostPayload(data: SaleCostFormData, saleItemId?: string | null) {
  const payee = emptyToNull(data.payee_id);
  return {
    kind: data.kind,
    amount: data.amount,
    description: emptyToNull(data.description),
    payee_supplier_id: data.kind === "COMMISSION" ? null : payee,
    payee_partner_id: data.kind === "COMMISSION" ? payee : null,
    ...(saleItemId ? { sale_item_id: saleItemId } : {}),
  };
}

// --- Service (AYD-010) -----------------------------------------------------

export const serviceSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório"),
  unit: z.string(),
  reference_price: z.number().min(0, "Valor deve ser >= 0"),
  reference_cost: z.number().min(0, "Valor deve ser >= 0"),
  notes: z.string(),
});

export type ServiceFormData = z.infer<typeof serviceSchema>;

/** Corpo de POST/PUT /services. Referências 0 = sem sugestão (null). */
export function toServicePayload(data: ServiceFormData) {
  return {
    name: data.name.trim(),
    unit: emptyToNull(data.unit),
    reference_price: data.reference_price > 0 ? data.reference_price : null,
    reference_cost: data.reference_cost > 0 ? data.reference_cost : null,
    notes: emptyToNull(data.notes),
  };
}
