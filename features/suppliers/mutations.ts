"use client";

import { http } from "@/lib/http";
import { useApiMutation } from "@/lib/mutation";
import type { Fornecedor } from "@/lib/types";
import type { SupplierFormData } from "./schemas";

/** Criar ou atualizar um fornecedor/prestador. Emite SUPPLIER_CHANGED. */
export function useSaveSupplier(entity?: Fornecedor) {
  return useApiMutation({
    run: (payload: SupplierFormData) =>
      entity ? http.put<Fornecedor>(`/fornecedores/${entity.id}`, payload) : http.post<Fornecedor>("/fornecedores", payload),
    emits: "SUPPLIER_CHANGED",
    successMessage: entity ? "Fornecedor atualizado." : "Fornecedor criado.",
    errorFallback: "Erro ao salvar fornecedor.",
  });
}
