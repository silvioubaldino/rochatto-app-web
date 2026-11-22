"use client";

import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ItemsGrid, fromQuoteItem } from "@/components/entity/items-grid";
import { EntityLink } from "@/components/entity/EntityLink";
import { PageHeader } from "@/components/patterns/detail";
import { StatusBadge } from "@/components/patterns/StatusBadge";
import { DateText, MoneyText } from "@/components/patterns/values";
import { SaleOutcomeBanner } from "./SaleOutcomeBanner";
import { formatPercent } from "@/lib/format";
import type { Quote } from "@/lib/types";
import { estimatedMargin, quoteTitle } from "../model";
import { useSetQuoteStatus } from "../mutations";

/** Orçamento ganho ou perdido (T04): visualização; o ganho leva à venda, o perdido pode reabrir. */
export function QuoteReadOnlyView({ quote }: { quote: Quote }) {
  const status = useSetQuoteStatus(quote.id);
  const lines = (quote.items ?? []).map(fromQuoteItem);
  const margin = estimatedMargin(quote);
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <PageHeader
        title={quoteTitle(quote)}
        subtitle={<EntityLink type="customer" id={quote.customer_id} mode="peek">{quote.customer_name}</EntityLink>}
        backFallback="/orcamentos"
        backLabel="Orçamentos"
        badges={
          <>
            <StatusBadge kind="quote" value={quote.status} />
            {quote.quick_sale && <StatusBadge tone="info">Venda rápida</StatusBadge>}
          </>
        }
        actions={quote.status === "LOST" ? <Button variant="outline" onClick={() => void status.mutate("OPEN")} disabled={status.pending}>Reabrir orçamento</Button> : undefined}
      />

      {quote.status === "WON" && quote.sale_id && (
        <div role="status" className="flex flex-wrap items-center gap-2 rounded-lg bg-success-subtle px-4 py-3 text-success">
          <CheckCircle2 className="size-4" aria-hidden />
          <span className="font-medium">Virou a</span>
          <EntityLink type="sale" id={quote.sale_id} className="font-medium underline">
            {quote.sale_number ? `Venda nº ${quote.sale_number}` : "Venda"} ›
          </EntityLink>
        </div>
      )}
      {quote.status === "LOST" && (
        <p className="rounded-lg bg-danger-subtle px-4 py-3 text-danger">
          Perdido{quote.lost_reason ? `: ${quote.lost_reason}` : "."}
        </p>
      )}

      <dl className="grid grid-cols-2 gap-4 rounded-lg border bg-card p-4 text-sm sm:grid-cols-4">
        <div><dt className="text-muted-foreground">Data</dt><dd><DateText value={quote.quote_date.slice(0, 10)} /></dd></div>
        <div><dt className="text-muted-foreground">Indicação</dt><dd>{quote.referrer_id ? <EntityLink type="partner" id={quote.referrer_id} mode="peek">{quote.referrer_name}</EntityLink> : "—"}</dd></div>
        <div><dt className="text-muted-foreground">Total</dt><dd><MoneyText value={quote.total_quote} /></dd></div>
        <div><dt className="text-muted-foreground">Margem estimada</dt><dd>{formatPercent(margin)}</dd></div>
        {quote.notes && <div className="col-span-full"><dt className="text-muted-foreground">Observações</dt><dd className="whitespace-pre-wrap">{quote.notes}</dd></div>}
      </dl>

      <section aria-labelledby="ro-items" className="space-y-3 rounded-lg border bg-card p-4">
        <h2 id="ro-items" className="text-sm font-semibold">Items</h2>
        <ItemsGrid mode="quote" lines={lines} readOnly onChange={() => undefined} />
        {(quote.charges?.length ?? 0) > 0 && (
          <ul className="space-y-1 border-t pt-3 text-sm">
            {quote.charges?.map((c) => (
              <li key={c.id} className="flex justify-between gap-3"><span>{c.description || (c.kind === "FREIGHT" ? "Frete cobrado" : "Outra cobrança")}</span><MoneyText value={c.amount} /></li>
            ))}
          </ul>
        )}
        {quote.sale_id && <SaleOutcomeBanner saleId={quote.sale_id} estimatedMargin={margin} />}
      </section>
    </div>
  );
}
