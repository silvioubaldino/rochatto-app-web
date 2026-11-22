"use client";

import { EntityLink } from "@/components/entity/EntityLink";
import { registerPreview, type PreviewData } from "@/components/entity/EntitySheet";
import { PreviewFields, PreviewList, PreviewSection } from "@/components/entity/preview-parts";
import { StatusBadge } from "@/components/patterns/StatusBadge";
import { DateText, MoneyText, QuantityText } from "@/components/patterns/values";
import { useQuote } from "@/hooks/useQuote";
import { docTitle } from "@/lib/format";
import type { Quote } from "@/lib/types";

function useQuotePreview(id: string): PreviewData<Quote> {
  const { quote, isLoading, error, refresh } = useQuote(id);
  return { data: quote, isLoading, error, retry: () => void refresh() };
}

function QuotePreviewBody({ data }: { data: Quote }) {
  const cost = (data.items ?? []).reduce((acc, i) => acc + i.quantity * i.unit_cost, 0);
  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        <StatusBadge kind="quote" value={data.status} />
        {data.quick_sale && <StatusBadge tone="info">Venda rápida</StatusBadge>}
      </div>
      <PreviewFields
        rows={[
          { label: "Cliente", value: <EntityLink type="customer" id={data.customer_id}>{data.customer_name}</EntityLink> },
          { label: "Data", value: <DateText value={data.quote_date} /> },
          { label: "Total", value: <MoneyText value={data.total_quote} /> },
          { label: "Custo estimado", value: <MoneyText value={cost} /> },
          ...(data.sale_id
            ? [{ label: "Venda", value: <EntityLink type="sale" id={data.sale_id}>{data.sale_number ? `Venda nº ${data.sale_number}` : "Ver venda"}</EntityLink> }]
            : []),
        ]}
      />
      <PreviewSection title={`Itens (${data.items?.length ?? 0})`}>
        <PreviewList
          items={data.items ?? []}
          render={(i) => (
            <>
              <span className="min-w-0 truncate">{i.product_name}</span>
              <QuantityText value={i.quantity} />
            </>
          )}
        />
      </PreviewSection>
    </>
  );
}

registerPreview<Quote>("quote", {
  title: (q) => docTitle("Orçamento", q.number, q.id, q.customer_name),
  useData: useQuotePreview,
  Body: QuotePreviewBody,
});
