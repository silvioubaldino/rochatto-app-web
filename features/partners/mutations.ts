"use client";

import { http } from "@/lib/http";
import { useApiMutation } from "@/lib/mutation";
import type { toPartnerPayload } from "@/lib/schemas";
import type { Partner } from "@/lib/types";

export function useSavePartner(entity?: Partner) {
  return useApiMutation({
    run: (payload: ReturnType<typeof toPartnerPayload>) =>
      entity ? http.put<Partner>(`/partners/${entity.id}`, payload) : http.post<Partner>("/partners", payload),
    emits: "PARTNER_CHANGED",
    successMessage: entity ? "Parceiro atualizado." : "Parceiro criado.",
    errorFallback: "Erro ao salvar parceiro.",
  });
}

export function useDeletePartner() {
  return useApiMutation({
    run: async (id: string) => {
      await http.delete(`/partners/${id}`);
      return true as const;
    },
    emits: "PARTNER_CHANGED",
    successMessage: "Parceiro excluído.",
    toastOnError: false,
  });
}
