"use client";

import { registerPreview, type PreviewData } from "@/components/entity/EntitySheet";
import { PreviewFields } from "@/components/entity/preview-parts";
import { MoneyText, QuantityText } from "@/components/patterns/values";
import { useProduto } from "@/hooks/useProdutos";
import { useStockStatement } from "@/hooks/useStock";
import type { Produto } from "@/lib/types";

function useProductPreview(id: string): PreviewData<Produto> {
  const { produto, isLoading, error, refresh } = useProduto(id);
  return { data: produto, isLoading, error, retry: () => void refresh() };
}

function ProductPreviewBody({ data }: { data: Produto }) {
  const { statement } = useStockStatement(data.id);
  return (
    <PreviewFields
      rows={[
        { label: "Categoria", value: data.category_name },
        { label: "Unidade", value: data.unidade },
        { label: "Preço de referência", value: data.preco_referencia ? <MoneyText value={data.preco_referencia} /> : undefined },
        { label: "Custo de referência", value: data.custo_referencia ? <MoneyText value={data.custo_referencia} /> : undefined },
        {
          label: "Saldo em estoque",
          value: statement ? <QuantityText value={statement.balance} unit={statement.unit} className={statement.balance < 0 ? "text-danger" : undefined} /> : undefined,
        },
        { label: "Custo da última entrada", value: statement?.last_inflow_cost ? <MoneyText value={statement.last_inflow_cost} /> : undefined },
      ]}
    />
  );
}

registerPreview<Produto>("product", {
  title: (p) => p.nome,
  useData: useProductPreview,
  Body: ProductPreviewBody,
});
