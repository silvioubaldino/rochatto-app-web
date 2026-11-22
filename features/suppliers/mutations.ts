"use client";

import { http } from "@/lib/http";
import { useApiMutation } from "@/lib/mutation";
import type { Fornecedor } from "@/lib/types";
import type { SupplierFormData } from "./schemas";

export function useSaveSupplier(entity?: Fornecedor) {
  return useApiMutation({
    run: (payload: SupplierFormData) =>
      entity ? http.put<Fornecedor>(`/fornecedores/${entity.id}`, payload) : http.post<Fornecedor>("/fornecedores", payload),
    emits: "SUPPLIER_CHANGED",
    successMessage: entity ? "Fornecedor atualizado." : "Fornecedor criado.",
    errorFallback: "Erro ao salvar fornecedor.",
  });
}

export function useDeleteSupplier() {
  return useApiMutation({
    run: async (id: string) => {
      await http.delete(`/fornecedores/${id}`);
      return true as const;
    },
    emits: "SUPPLIER_CHANGED",
    successMessage: "Fornecedor excluído.",
    toastOnError: false,
  });
}
