"use client";

import { http } from "@/lib/http";
import { useApiMutation } from "@/lib/mutation";
import { emptyToNull, type toServicePayload } from "@/lib/schemas";
import type { ProductCategory, Produto, Service } from "@/lib/types";
import type { ProductFormData } from "./schemas";

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

export function useSaveService(entity?: Service) {
  return useApiMutation({
    run: (payload: ReturnType<typeof toServicePayload>) =>
      entity ? http.put<Service>(`/services/${entity.id}`, payload) : http.post<Service>("/services", payload),
    emits: "CATALOG_CHANGED",
    successMessage: entity ? "Serviço atualizado." : "Serviço criado.",
    errorFallback: "Erro ao salvar serviço.",
  });
}

export function useDeleteProduct() {
  return useApiMutation({
    run: async (id: string) => {
      await http.delete(`/produtos/${id}`);
      return true as const;
    },
    emits: "CATALOG_CHANGED",
    successMessage: "Produto excluído.",
    toastOnError: false,
  });
}

export function useDeleteService() {
  return useApiMutation({
    run: async (id: string) => {
      await http.delete(`/services/${id}`);
      return true as const;
    },
    emits: "CATALOG_CHANGED",
    successMessage: "Serviço excluído.",
    toastOnError: false,
  });
}

export function useSaveCategory(entity?: ProductCategory) {
  return useApiMutation({
    run: (name: string) =>
      entity ? http.put<ProductCategory>(`/product-categories/${entity.id}`, { name }) : http.post<ProductCategory>("/product-categories", { name }),
    emits: "CATALOG_CHANGED",
    successMessage: entity ? "Categoria renomeada." : "Categoria criada.",
    toastOnError: false,
  });
}

export function useDeleteCategory() {
  return useApiMutation({
    run: async (id: string) => {
      await http.delete(`/product-categories/${id}`);
      return true as const;
    },
    emits: "CATALOG_CHANGED",
    successMessage: "Categoria excluída.",
    toastOnError: false,
  });
}
