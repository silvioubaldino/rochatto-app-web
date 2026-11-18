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
