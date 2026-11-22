"use client";

import { registerPreview, type PreviewData } from "@/components/entity/EntitySheet";
import { PreviewFields } from "@/components/entity/preview-parts";
import { useFornecedor } from "@/hooks/useFornecedores";
import { SUPPLIER_KIND_LABELS } from "@/lib/format";
import type { Fornecedor } from "@/lib/types";

function useSupplierPreview(id: string): PreviewData<Fornecedor> {
  const { fornecedor, isLoading, error, refresh } = useFornecedor(id);
  return { data: fornecedor, isLoading, error, retry: () => void refresh() };
}

registerPreview<Fornecedor>("supplier", {
  title: (s) => s.nome,
  useData: useSupplierPreview,
  Body: ({ data }) => (
    <PreviewFields
      rows={[
        { label: "Tipo", value: data.kind ? SUPPLIER_KIND_LABELS[data.kind] : undefined },
        { label: "Cidade", value: data.cidade },
        { label: "Telefone", value: data.telefone },
        { label: "Observações", value: data.observacoes },
      ]}
    />
  ),
});
