"use client";

import { http } from "@/lib/http";
import { useApiMutation } from "@/lib/mutation";
import { emptyToNull, type toServicePayload } from "@/lib/schemas";
import type { Produto, Service } from "@/lib/types";
import type { ProductFormData } from "./schemas";

/** Criar ou atualizar um Product. Emite CATALOG_CHANGED. */
export function useSaveProduct(entity?: Produto) {
  return useApiMutation({
    run: (payload: ProductFormData) => {
      // C8: no PUT, campo AUSENTE mantém o valor; aqui o formulário sempre o envia (null limpa).
      const body = { ...payload, category_id: emptyToNull(payload.category_id), default_supplier_id: emptyToNull(payload.default_supplier_id) };
      return entity ? http.put<Produto>(`/produtos/${entity.id}`, body) : http.post<Produto>("/produtos", body);
    },
    emits: "CATALOG_CHANGED",
    successMessage: entity ? "Produto atualizado." : "Produto criado.",
    errorFallback: "Erro ao salvar produto.",
  });
}

/** Criar ou atualizar um Service. Emite CATALOG_CHANGED. 409 = nome já usado (mensagem da api). */
export function useSaveService(entity?: Service) {
  return useApiMutation({
    run: (payload: ReturnType<typeof toServicePayload>) =>
      entity ? http.put<Service>(`/services/${entity.id}`, payload) : http.post<Service>("/services", payload),
    emits: "CATALOG_CHANGED",
    successMessage: entity ? "Serviço atualizado." : "Serviço criado.",
    errorFallback: "Erro ao salvar serviço.",
  });
}
