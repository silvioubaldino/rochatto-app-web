import { z } from "zod";

export const supplierSchema = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório"),
  kind: z.enum(["STONE", "TRANSPORT", "LABOR", "TAX_AUTHORITY", "OTHER"]),
  cidade: z.string(),
  telefone: z.string(),
  observacoes: z.string(),
});

export type SupplierFormData = z.infer<typeof supplierSchema>;
