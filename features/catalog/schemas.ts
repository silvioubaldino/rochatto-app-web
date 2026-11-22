import { z } from "zod";

export const productSchema = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório"),
  descricao: z.string(),
  preco_referencia: z.number().min(0, "Valor deve ser >= 0"),
  custo_referencia: z.number().min(0, "Valor deve ser >= 0"),
  unidade: z.string(),
  category_id: z.string(),
  default_supplier_id: z.string(),
});

export type ProductFormData = z.infer<typeof productSchema>;
