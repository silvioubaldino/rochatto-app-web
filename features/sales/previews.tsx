"use client";

import { EntityLink } from "@/components/entity/EntityLink";
import { registerPreview, type PreviewData } from "@/components/entity/EntitySheet";
import { PreviewFields, PreviewList, PreviewSection } from "@/components/entity/preview-parts";
import { StatusBadge } from "@/components/patterns/StatusBadge";
import { DateText, MoneyText, QuantityText } from "@/components/patterns/values";
import { useVenda } from "@/hooks/useVenda";
import { isServiceOnlySale } from "@/lib/format";
import type { Venda } from "@/lib/types";

function useSalePreview(id: string): PreviewData<Venda> {
  const { venda, isLoading, error, refresh } = useVenda(id);
  return { data: venda, isLoading, error, retry: () => void refresh() };
}

export function saleTitle(v: Venda): string {
  return `${v.number ? `Venda nº ${v.number}` : "Venda"} · ${v.cliente_nome}`;
}

function SalePreviewBody({ data }: { data: Venda }) {
  const serviceOnly = isServiceOnlySale(data.itens);
  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        <StatusBadge kind="saleDelivery" value={data.delivery_status} serviceOnly={serviceOnly} />
        <StatusBadge kind="salePayment" value={data.payment_status} />
      </div>
      <PreviewFields
        rows={[
          { label: "Cliente", value: <EntityLink type="customer" id={data.cliente_id}>{data.cliente_nome}</EntityLink> },
          { label: "Data", value: <DateText value={data.data_venda} /> },
          { label: "Prazo de entrega", value: <DateText value={data.data_entrega_prevista} /> },
          { label: "Preço", value: <MoneyText value={data.total_venda} /> },
          { label: "Recebido", value: <MoneyText value={data.total_recebido} /> },
          { label: "A receber", value: <MoneyText value={data.receivable} tone={data.receivable > 0 ? "warning" : undefined} /> },
          { label: "Lucro", value: <MoneyText value={data.lucro} /> },
        ]}
      />
      <PreviewSection title={`Itens (${data.itens?.length ?? 0})`}>
        <PreviewList
          items={data.itens ?? []}
          render={(i) => (
            <>
              <span className="min-w-0 truncate">{i.produto_nome}</span>
              <QuantityText value={i.quantidade} />
            </>
          )}
        />
      </PreviewSection>
    </>
  );
}

registerPreview<Venda>("sale", {
  title: saleTitle,
  useData: useSalePreview,
  Body: SalePreviewBody,
});
