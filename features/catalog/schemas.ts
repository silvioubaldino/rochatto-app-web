import { z } from "zod";

// Produto do catálogo (RF-02). Nomes dos campos = contrato legado da api (PT).
export const productSchema = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório"),
  descricao: z.string(),
  preco_referencia: z.number().min(0, "Valor deve ser >= 0"),
  custo_referencia: z.number().min(0, "Valor deve ser >= 0"),
  unidade: z.string(),
  category_id: z.string(), // "" = sem categoria (enviado como null)
  default_supplier_id: z.string(), // C8: "" = sem fornecedor habitual (enviado como null)
});

export type ProductFormData = z.infer<typeof productSchema>;
