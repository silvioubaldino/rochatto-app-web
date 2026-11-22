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
