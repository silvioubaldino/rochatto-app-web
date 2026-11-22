"use client";

import { Suspense } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { CITY_FILTER_SPEC, CityFilter, CityGroupToggle, useCityView } from "@/components/entity/city-view";
import { EntityCombobox } from "@/components/entity/EntityCombobox";
import { EntityLink } from "@/components/entity/EntityLink";
import { DataTable, type DataTableColumn } from "@/components/patterns/DataTable";
import { DateField, FieldShell } from "@/components/patterns/fields";
import { FilterBar } from "@/components/patterns/FilterBar";
import { Select } from "@/components/patterns/Select";
import { StatusBadge } from "@/components/patterns/StatusBadge";
import { useUrlFilters } from "@/components/patterns/useUrlFilters";
import { DateText, MoneyText } from "@/components/patterns/values";
import { useVendas, type VendasFilters } from "@/hooks/useVendas";
import { summarizeSales } from "@/lib/customer-city";
import { SALE_DELIVERY_STATUSES, SALE_DELIVERY_STATUS_LABELS, SALE_PAYMENT_STATUSES, SALE_PAYMENT_STATUS_LABELS, docNumber, formatMoney, saleItemsSummary, todayISO } from "@/lib/format";
import type { Venda } from "@/lib/types";
import { SALE_CHIPS, chipOf, chipPatch, isLate, type SaleChip } from "../model";

const SPEC = { q: {}, delivery_status: {}, payment_status: {}, late: {}, from: {}, to: {}, cliente_id: {}, referrer_id: {}, ...CITY_FILTER_SPEC } as const;
const customerOf = (v: Venda) => v.cliente_id;

function SalesContent() {
  const f = useUrlFilters(SPEC);
  const v = f.values;
  const today = todayISO();
  const { vendas, isLoading, error, refresh } = useVendas({
    delivery_status: (v.delivery_status || undefined) as VendasFilters["delivery_status"],
    payment_status: (v.payment_status || undefined) as VendasFilters["payment_status"],
    from: v.from || undefined,
    to: v.to || undefined,
    cliente_id: v.cliente_id || undefined,
    referrer_id: v.referrer_id || undefined,
    q: v.q || undefined,
  });
  const rows = v.late === "1" ? vendas.filter((s) => isLate(s, today)) : vendas;
  const city = useCityView(rows, customerOf, v);
  const showItems = vendas.some((s) => saleItemsSummary(s) !== null);
  const chip = chipOf(v);

  const columns: DataTableColumn<Venda>[] = [
    { id: "number", header: "Nº", phone: "title", sortValue: (s) => s.number ?? 0, cell: (s) => docNumber("Venda", s.number, s.id) },
    { id: "date", header: "Data", phone: "meta", sortValue: (s) => s.data_venda, cell: (s) => <DateText value={s.data_venda.slice(0, 10)} /> },
    {
      id: "customer",
      header: "Cliente",
      phone: "subtitle",
      sortValue: (s) => s.cliente_nome,
      cell: (s) => (
        <span>
          <EntityLink type="customer" id={s.cliente_id} mode="peek">{s.cliente_nome}</EntityLink>
          {city.rowCity(s) && <span className="block text-xs text-muted-foreground">{city.rowCity(s)}</span>}
        </span>
      ),
    },
    ...(showItems ? [{ id: "items", header: "Items", phone: "meta" as const, cell: (s: Venda) => <span className="text-muted-foreground">{saleItemsSummary(s) ?? "—"}</span> }] : []),
    { id: "total", header: "Total", phone: "value", align: "right", sortValue: (s) => s.total_venda, cell: (s) => <MoneyText value={s.total_venda} /> },
    { id: "receivable", header: "A receber", phone: "meta", align: "right", sortValue: (s) => s.receivable, cell: (s) => <MoneyText value={s.receivable} tone={s.receivable > 0 ? "warning" : undefined} /> },
    { id: "profit", header: "Lucro", phone: "meta", align: "right", sortValue: (s) => s.lucro, cell: (s) => <MoneyText value={s.lucro} /> },
    {
      id: "delivery",
      header: "Entrega",
      phone: "badge",
      cell: (s) => {
        const late = isLate(s, today);
        return (
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <StatusBadge kind="saleDelivery" value={s.delivery_status} overdue={late} />
            {s.delivery_status === "TO_DELIVER" && s.data_entrega_prevista && (
              <span className={late ? "text-xs text-danger" : "text-xs text-muted-foreground"}>{late ? "atrasada · " : "até "}<DateText value={s.data_entrega_prevista.slice(0, 10)} /></span>
            )}
          </span>
        );
      },
    },
    { id: "payment", header: "Pagamento", phone: "badge", cell: (s) => <StatusBadge kind="salePayment" value={s.payment_status} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Vendas</h1>
        <div className="flex gap-2">
          <Link href="/orcamentos/novo?rapida=1" className={buttonVariants({ variant: "outline" })}>Venda rápida</Link>
          <Link href="/orcamentos/novo" className={buttonVariants()}>Novo orçamento</Link>
        </div>
      </div>
      <FilterBar
        chips={[{ label: "Situação", options: SALE_CHIPS, value: chip === "custom" ? "__custom__" : chip, onChange: (c) => f.set(chipPatch(c as SaleChip)) }]}
        search={{ value: v.q, onChange: (q) => f.set({ q }), placeholder: "Buscar por cliente, nº ou item" }}
        activeCount={f.activeCount}
        onClear={f.clear}
      >
        <FieldShell label="Entrega" htmlFor="sf-delivery">
          <Select id="sf-delivery" value={v.delivery_status} onChange={(x) => f.set({ delivery_status: x, late: "" })} options={[{ value: "", label: "Todas" }, ...SALE_DELIVERY_STATUSES.map((s) => ({ value: s, label: SALE_DELIVERY_STATUS_LABELS[s] }))]} />
        </FieldShell>
        <FieldShell label="Pagamento" htmlFor="sf-payment">
          <Select id="sf-payment" value={v.payment_status} onChange={(x) => f.set({ payment_status: x })} options={[{ value: "", label: "Todos" }, { value: "PENDING,PARTIAL", label: "Em aberto" }, ...SALE_PAYMENT_STATUSES.map((s) => ({ value: s, label: SALE_PAYMENT_STATUS_LABELS[s] }))]} />
        </FieldShell>
        <FieldShell label="De" htmlFor="sf-from"><DateField id="sf-from" shortcuts={false} value={v.from} onChange={(x) => f.set({ from: x })} /></FieldShell>
        <FieldShell label="Até" htmlFor="sf-to"><DateField id="sf-to" shortcuts={false} value={v.to} onChange={(x) => f.set({ to: x })} /></FieldShell>
        <FieldShell label="Cliente" htmlFor="sf-customer"><EntityCombobox kind="customer" id="sf-customer" value={v.cliente_id} allowCreate={false} placeholder="Todos os clientes" onChange={(id) => f.set({ cliente_id: id })} /></FieldShell>
        <FieldShell label="Parceiro" htmlFor="sf-referrer"><EntityCombobox kind="partner" id="sf-referrer" value={v.referrer_id} allowCreate={false} placeholder="Todos os parceiros" onChange={(id) => f.set({ referrer_id: id })} /></FieldShell>
        <CityFilter cidade={v.cidade} options={city.options} onChange={(cidade) => f.set({ cidade })} />
      </FilterBar>
      <div className="flex justify-end">
        <CityGroupToggle agrupar={v.agrupar} onChange={(agrupar) => f.set({ agrupar })} />
      </div>
      <DataTable
        caption="Vendas"
        columns={columns}
        rows={city.visible}
        rowKey={(s) => s.id}
        rowHref={(s) => `/vendas/${s.id}`}
        isLoading={isLoading || city.loading}
        error={error}
        onRetry={() => void refresh()}
        empty={{ title: "Nenhuma venda encontrada.", description: "A venda nasce do orçamento.", action: { label: "Novo orçamento", href: "/orcamentos/novo" } }}
        grouping={city.grouped ? { keyOf: city.groupKey, label: (k, g) => `${city.groupLabel(k)} · ${g.length}`, lastKeys: ["__none__"], summary: (_k, g) => { const s = summarizeSales(g); return `${formatMoney(s.total)} · a receber ${formatMoney(s.receivable)}`; } } : undefined}
      />
    </div>
  );
}

export function SalesList() {
  return (
    <Suspense fallback={null}>
      <SalesContent />
    </Suspense>
  );
}
