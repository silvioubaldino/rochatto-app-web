"use client";

import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { CITY_FILTER_SPEC, CityFilter, CityGroupToggle, useCityView } from "@/components/entity/city-view";
import { EntityCombobox } from "@/components/entity/EntityCombobox";
import { EntityLink } from "@/components/entity/EntityLink";
import { DataTable, type DataTableColumn } from "@/components/patterns/DataTable";
import { DateField, FieldShell } from "@/components/patterns/fields";
import { FilterBar } from "@/components/patterns/FilterBar";
import { StatusBadge } from "@/components/patterns/StatusBadge";
import { useUrlFilters } from "@/components/patterns/useUrlFilters";
import { DateText, MoneyText } from "@/components/patterns/values";
import { useQuotes } from "@/hooks/useQuotes";
import { formatMoney, quoteItemsSummary } from "@/lib/format";
import { summarizeQuotes } from "@/lib/customer-city";
import type { Quote, QuoteStatus } from "@/lib/types";
import { QUOTE_CHIPS, quoteAge, quoteTitle } from "../model";

const SPEC = { q: {}, status: {}, from: {}, to: {}, customer_id: {}, referrer_id: {}, ...CITY_FILTER_SPEC } as const;
const customerOf = (q: Quote) => q.customer_id;

function QuotesContent() {
  const f = useUrlFilters(SPEC);
  const v = f.values;
  const { quotes, isLoading, error, refresh } = useQuotes({
    status: (v.status || undefined) as QuoteStatus | undefined,
    from: v.from || undefined,
    to: v.to || undefined,
    customer_id: v.customer_id || undefined,
    referrer_id: v.referrer_id || undefined,
    q: v.q || undefined,
  });
  const city = useCityView(quotes, customerOf, v);
  const showItems = quotes.some((q) => quoteItemsSummary(q) !== null);

  const columns: DataTableColumn<Quote>[] = [
    { id: "number", header: "Nº", phone: "title", sortValue: (q) => q.number ?? 0, cell: (q) => quoteTitle(q) },
    { id: "date", header: "Data", phone: "meta", sortValue: (q) => q.quote_date, cell: (q) => <DateText value={q.quote_date.slice(0, 10)} /> },
    {
      id: "customer",
      header: "Cliente",
      phone: "subtitle",
      sortValue: (q) => q.customer_name,
      cell: (q) => (
        <span>
          <EntityLink type="customer" id={q.customer_id} mode="peek">{q.customer_name}</EntityLink>
          {city.rowCity(q) && <span className="block text-xs text-muted-foreground">{city.rowCity(q)}</span>}
        </span>
      ),
    },
    ...(showItems ? [{ id: "items", header: "Items", phone: "meta" as const, cell: (q: Quote) => <span className="text-muted-foreground">{quoteItemsSummary(q) ?? "—"}</span> }] : []),
    { id: "total", header: "Total", phone: "value", align: "right", sortValue: (q) => q.total_quote, cell: (q) => <MoneyText value={q.total_quote} /> },
    {
      id: "status",
      header: "Status",
      phone: "badge",
      cell: (q) => (
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <StatusBadge kind="quote" value={q.status} />
          {quoteAge(q) && <span className="text-xs text-muted-foreground">{quoteAge(q)}</span>}
          {q.quick_sale && <StatusBadge tone="info">Venda rápida</StatusBadge>}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Orçamentos</h1>
        <Link href="/orcamentos/novo" className={buttonVariants()}>
          <Plus aria-hidden />
          Novo orçamento
        </Link>
      </div>
      <FilterBar
        chips={[{ label: "Situação", options: QUOTE_CHIPS, value: v.status, onChange: (s) => f.set({ status: s }) }]}
        search={{ value: v.q, onChange: (q) => f.set({ q }), placeholder: "Buscar por cliente, nº ou item" }}
        activeCount={f.activeCount}
        onClear={f.clear}
      >
        <FieldShell label="De" htmlFor="qf-from"><DateField id="qf-from" shortcuts={false} value={v.from} onChange={(x) => f.set({ from: x })} /></FieldShell>
        <FieldShell label="Até" htmlFor="qf-to"><DateField id="qf-to" shortcuts={false} value={v.to} onChange={(x) => f.set({ to: x })} /></FieldShell>
        <FieldShell label="Cliente" htmlFor="qf-customer"><EntityCombobox kind="customer" id="qf-customer" value={v.customer_id} allowCreate={false} placeholder="Todos os clientes" onChange={(id) => f.set({ customer_id: id })} /></FieldShell>
        <FieldShell label="Indicação" htmlFor="qf-referrer"><EntityCombobox kind="partner" id="qf-referrer" value={v.referrer_id} allowCreate={false} placeholder="Todos os parceiros" onChange={(id) => f.set({ referrer_id: id })} /></FieldShell>
        <CityFilter cidade={v.cidade} options={city.options} onChange={(cidade) => f.set({ cidade })} />
      </FilterBar>
      <div className="flex justify-end">
        <CityGroupToggle agrupar={v.agrupar} onChange={(agrupar) => f.set({ agrupar })} />
      </div>
      <DataTable
        caption="Orçamentos"
        columns={columns}
        rows={city.visible}
        rowKey={(q) => q.id}
        rowHref={(q) => `/orcamentos/${q.id}`}
        isLoading={isLoading || city.loading}
        error={error}
        onRetry={() => void refresh()}
        empty={{ title: "Nenhum orçamento encontrado.", action: { label: "Novo orçamento", href: "/orcamentos/novo" } }}
        grouping={city.grouped ? { keyOf: city.groupKey, label: (k, rows) => `${city.groupLabel(k)} · ${rows.length}`, lastKeys: ["__none__"], summary: (_k, rows) => { const s = summarizeQuotes(rows); return s.byStatus.OPEN > 0 ? `${formatMoney(s.openTotal)} em aberto` : null; } } : undefined}
      />
    </div>
  );
}

export function QuotesList() {
  return (
    <Suspense fallback={null}>
      <QuotesContent />
    </Suspense>
  );
}
