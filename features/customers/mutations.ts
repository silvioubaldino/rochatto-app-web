"use client";

import { http } from "@/lib/http";
import { useApiMutation } from "@/lib/mutation";
import type { toClientePayload } from "@/lib/schemas";
import type { Cliente } from "@/lib/types";

/** Criar (sem `entity`) ou atualizar um Customer. Emite CUSTOMER_CHANGED. */
export function useSaveCustomer(entity?: Cliente) {
  return useApiMutation({
    run: (payload: ReturnType<typeof toClientePayload>) =>
      entity ? http.put<Cliente>(`/clientes/${entity.id}`, payload) : http.post<Cliente>("/clientes", payload),
    emits: "CUSTOMER_CHANGED",
    successMessage: entity ? "Cliente atualizado." : "Cliente criado.",
    errorFallback: "Erro ao salvar cliente.",
  });
}

/** Exclui um Customer (soft-delete). O erro sobe para o ConfirmDialog. */
export function useDeleteCustomer() {
  return useApiMutation({
    run: async (id: string) => {
      await http.delete(`/clientes/${id}`);
      return true as const;
    },
    emits: "CUSTOMER_CHANGED",
    successMessage: "Cliente excluído.",
    toastOnError: false,
  });
}
