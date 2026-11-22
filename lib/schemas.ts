import { z } from "zod";
import type { MovementCategory, Obligation } from "./types";
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

// --- Contas e movimentações (AYD-007) ----------------------------------------
// Os formulários de Pagar/Receber, parcelas e movimentações moram em `features/finance` (schema +
// payload em `model.ts`); aqui ficam só os montadores compartilhados.

/** Sinal exigido pela categoria: entrada > 0, saída < 0 (AYD-007). */
export function signedMovementAmount(category: MovementCategory, magnitude: number): number {
  return isInflowCategory(category) ? Math.abs(magnitude) : -Math.abs(magnitude);
}

/** Só os campos alterados; `null` limpa o prazo/observações. Vazio = nada a enviar. */
export function toObligationPatchPayload(
  data: { due_date: string; notes: string },
  original: Pick<Obligation, "due_date" | "notes">,
): { due_date?: string | null; notes?: string | null } {
  const payload: { due_date?: string | null; notes?: string | null } = {};
  const dueDate = emptyToNull(data.due_date);
  const notes = emptyToNull(data.notes);
  if (dueDate !== (original.due_date ? original.due_date.slice(0, 10) : null)) payload.due_date = dueDate;
  if (notes !== (original.notes ?? null)) payload.notes = notes;
  return payload;
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
