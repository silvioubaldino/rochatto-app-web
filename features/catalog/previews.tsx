"use client";

import Link from "next/link";
import { registerPreview, type PreviewData } from "@/components/entity/EntitySheet";
import { PreviewFields, PreviewList, PreviewSection } from "@/components/entity/preview-parts";
import { buttonVariants } from "@/components/ui/button";
import { DateText, MoneyText, QuantityText } from "@/components/patterns/values";
import { useProduto } from "@/hooks/useProdutos";
import { STOCK_MOVEMENT_KIND_LABELS } from "@/lib/format";
import type { Produto } from "@/lib/types";
import { useStockStatement } from "@/features/stock/queries";
import { movementHref } from "@/features/stock/model";
import { EntityLink } from "@/components/entity/EntityLink";

function useProductPreview(id: string): PreviewData<Produto> {
  const { produto, isLoading, error, refresh } = useProduto(id);
  return { data: produto, isLoading, error, retry: () => void refresh() };
}

function ProductPreviewBody({ data }: { data: Produto }) {
  const { statement } = useStockStatement(data.id);
  const movements = [...(statement?.movements ?? [])].reverse();
  return (
    <>
      <PreviewFields
        rows={[
          { label: "Categoria", value: data.category_name },
          { label: "Unidade", value: data.unidade },
          { label: "Preço de referência", value: data.preco_referencia ? <MoneyText value={data.preco_referencia} /> : undefined },
          { label: "Custo de referência", value: data.custo_referencia ? <MoneyText value={data.custo_referencia} /> : undefined },
          { label: "Fornecedor habitual", value: data.default_supplier_id ? <EntityLink type="supplier" id={data.default_supplier_id}>{data.default_supplier_name ?? "Fornecedor"}</EntityLink> : undefined },
          {
            label: "Saldo em estoque",
            value: statement ? <QuantityText value={statement.balance} unit={statement.unit} className={statement.balance < 0 ? "text-danger" : undefined} /> : undefined,
          },
          { label: "Custo da última entrada", value: statement?.last_inflow_cost ? <MoneyText value={statement.last_inflow_cost} /> : undefined },
        ]}
      />
      {statement && (
        <PreviewSection title="Extrato do estoque">
          <PreviewList
            items={movements}
            max={8}
            empty="Nenhum movimento."
            render={(m) => {
              const href = movementHref(m);
              return (
                <>
                  <span className="min-w-0">
                    <DateText value={m.date.slice(0, 10)} /> ·{" "}
                    {href ? <Link href={href} className="relative z-10 underline-offset-4 hover:underline">{STOCK_MOVEMENT_KIND_LABELS[m.kind]}</Link> : STOCK_MOVEMENT_KIND_LABELS[m.kind]}
                  </span>
                  <QuantityText value={m.quantity} className={m.quantity < 0 ? "text-danger" : undefined} />
                </>
              );
            }}
          />
        </PreviewSection>
      )}
    </>
  );
}

function ProductPreviewActions({ data }: { data: Produto }) {
  return (
    <>
      <Link href={`/compras?repor=${data.id}`} className={buttonVariants()}>Comprar para estoque</Link>
      <Link href={`/estoque?ajuste=${data.id}`} className={buttonVariants({ variant: "outline" })}>Novo ajuste</Link>
    </>
  );
}

registerPreview<Produto>("product", {
  title: (p) => p.nome,
  useData: useProductPreview,
  Body: ProductPreviewBody,
  Actions: ProductPreviewActions,
});
