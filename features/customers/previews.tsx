"use client";

import { EntityLink } from "@/components/entity/EntityLink";
import { registerPreview, type PreviewData } from "@/components/entity/EntitySheet";
import { PreviewFields, PreviewList, PreviewSection } from "@/components/entity/preview-parts";
import { MoneyText, DateText } from "@/components/patterns/values";
import { StatusBadge } from "@/components/patterns/StatusBadge";
import { useCliente } from "@/hooks/useClientes";
import { useQuotes } from "@/hooks/useQuotes";
import { useVendas } from "@/hooks/useVendas";
import { formatLeadSource, sumMoney } from "@/lib/format";
import type { Cliente } from "@/lib/types";

function useCustomerPreview(id: string): PreviewData<Cliente> {
  const { cliente, isLoading, error, refresh } = useCliente(id);
  return { data: cliente, isLoading, error, retry: () => void refresh() };
}

function CustomerPreviewBody({ data }: { data: Cliente }) {
  const { vendas } = useVendas({ cliente_id: data.id });
  const { quotes } = useQuotes({ customer_id: data.id });
  const active = vendas.filter((v) => v.delivery_status !== "CANCELED");
  const receivable = sumMoney(active.map((v) => v.receivable ?? 0));
  const openQuotes = quotes.filter((q) => q.status === "OPEN");
  return (
    <>
      <PreviewFields
        rows={[
          { label: "Telefone", value: data.telefone },
          { label: "E-mail", value: data.email },
          { label: "Cidade", value: data.cidade },
          { label: "Origem", value: formatLeadSource(data.lead_source, data.referrer_name) },
          { label: "A receber", value: <MoneyText value={receivable} tone={receivable > 0 ? "warning" : undefined} /> },
        ]}
      />
      <PreviewSection title={`Orçamentos abertos (${openQuotes.length})`}>
        <PreviewList
          items={openQuotes}
          empty="Nenhum orçamento aberto."
          render={(q) => (
            <>
              <EntityLink type="quote" id={q.id} mode="page">
                {q.number ? `Orçamento nº ${q.number}` : "Orçamento"} · <DateText value={q.quote_date} />
              </EntityLink>
              <MoneyText value={q.total_quote} />
            </>
          )}
        />
      </PreviewSection>
      <PreviewSection title={`Últimas vendas (${active.length})`}>
        <PreviewList
          items={active}
          empty="Nenhuma venda."
          render={(v) => (
            <>
              <EntityLink type="sale" id={v.id} mode="page">
                {v.number ? `Venda nº ${v.number}` : "Venda"} · <DateText value={v.data_venda} />
              </EntityLink>
              <span className="flex items-center gap-2">
                <StatusBadge kind="salePayment" value={v.payment_status} />
                <MoneyText value={v.total_venda} />
              </span>
            </>
          )}
        />
      </PreviewSection>
    </>
  );
}

registerPreview<Cliente>("customer", {
  title: (c) => c.nome,
  useData: useCustomerPreview,
  Body: CustomerPreviewBody,
});
