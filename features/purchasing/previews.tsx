"use client";

import { EntityLink } from "@/components/entity/EntityLink";
import { registerPreview, type PreviewData } from "@/components/entity/EntitySheet";
import { PreviewFields, PreviewList, PreviewSection } from "@/components/entity/preview-parts";
import { StatusBadge } from "@/components/patterns/StatusBadge";
import { DateText, MoneyText } from "@/components/patterns/values";
import { usePurchase } from "@/hooks/usePurchases";
import { PURCHASE_KIND_LABELS } from "@/lib/format";
import type { PurchaseDetail } from "@/lib/types";

function usePurchasePreview(id: string): PreviewData<PurchaseDetail> {
  const { purchase, isLoading, error, refresh } = usePurchase(id);
  return { data: purchase, isLoading, error, retry: () => void refresh() };
}

function PurchasePreviewBody({ data }: { data: PurchaseDetail }) {
  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        <StatusBadge kind="purchase" value={data.status} />
      </div>
      <PreviewFields
        rows={[
          { label: "Fornecedor", value: <EntityLink type="supplier" id={data.supplier_id}>{data.supplier_name}</EntityLink> },
          { label: "Tipo", value: PURCHASE_KIND_LABELS[data.kind] },
          { label: "Previsão", value: <DateText value={data.expected_date} /> },
          { label: "Custo", value: <MoneyText value={data.total_cost} /> },
          { label: "Pago", value: <MoneyText value={data.paid} /> },
          { label: "A pagar", value: <MoneyText value={data.payable} tone={data.payable > 0 ? "warning" : undefined} /> },
        ]}
      />
      <PreviewSection title={`Vendas atendidas (${data.sale_items?.length ?? 0})`}>
        <PreviewList
          items={data.sale_items ?? []}
          render={(i) => (
            <EntityLink type="sale" id={i.sale_id}>
              {i.customer_name} · {i.produto_nome}
            </EntityLink>
          )}
        />
      </PreviewSection>
    </>
  );
}

registerPreview<PurchaseDetail>("purchase", {
  title: (p) => `${p.number ? `Compra nº ${p.number}` : "Compra"} · ${p.supplier_name}`,
  useData: usePurchasePreview,
  Body: PurchasePreviewBody,
});
