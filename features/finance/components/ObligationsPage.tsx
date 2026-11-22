"use client";

import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { EntityCombobox } from "@/components/entity/EntityCombobox";
import { EntityLink } from "@/components/entity/EntityLink";
import { useSettleFlow } from "@/components/entity/settle-flow";
import { DataTable, type DataTableColumn } from "@/components/patterns/DataTable";
import { FieldShell } from "@/components/patterns/fields";
import { FilterBar } from "@/components/patterns/FilterBar";
import { SelectBox } from "@/components/patterns/SelectBox";
import { StatusBadge } from "@/components/patterns/StatusBadge";
import { useUrlFilters } from "@/components/patterns/useUrlFilters";
import { DateText, MoneyText } from "@/components/patterns/values";
import { formatCounterparty, formatMoney, todayISO } from "@/lib/format";
import { PAGE_SIZE } from "@/lib/obligations";
import type { Obligation, ObligationDirection } from "@/lib/types";
import {
  DEFAULT_WHEN,
  OBLIGATION_CHIPS,
  OBLIGATION_GROUPINGS,
  counterpartyKey,
  groupSummary,
  obligationDue,
  obligationFiltersFromUrl,
  obligationVerb,
  pageLabel,
  partyLabel,
  selectedObligations,
} from "../model";
import { useObligations } from "../queries";

const SPEC = { quando: {}, counterparty_type: {}, counterparty_id: {}, agrupar: {}, offset: {} } as const;

function Content({ direction }: { direction: ObligationDirection }) {
  const f = useUrlFilters(SPEC);
  const v = f.values;
  const filters = obligationFiltersFromUrl(direction, v, todayISO());
  const { list, isLoading, error, refresh } = useObligations(filters);
  const settle = useSettleFlow();
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const receiving = direction === "RECEIVABLE";
  const verb = obligationVerb(direction);
  const rows = list?.items ?? [];
  const chosen = selectedObligations(rows, selected);
  const chosenTotal = Math.round(chosen.reduce((s, o) => s + o.open * 100, 0)) / 100;
  const grouped = v.agrupar === "credor";

  const toggle = (id: string) => setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const changeFilters = (patch: Parameters<typeof f.set>[0]) => { setSelected(new Set()); f.set({ offset: "", ...patch }); };

  const columns: DataTableColumn<Obligation>[] = [
    {
      id: "select",
      header: "Selecionar",
      phone: "meta",
      width: "3.5rem",
      cell: (o) => <SelectBox checked={selected.has(o.id)} disabled={o.open <= 0} onChange={() => toggle(o.id)} label={`Selecionar conta de ${formatCounterparty(o.counterparty)}`} />,
    },
    { id: "party", header: partyLabel(direction), phone: "title", sortValue: (o) => o.counterparty?.name ?? "", cell: (o) => formatCounterparty(o.counterparty) },
    { id: "origin", header: "Origem", phone: "subtitle", cell: (o) => <EntityLink type={o.origin.type === "SALE" ? "sale" : "purchase"} id={o.origin.id} mode="peek">{o.origin.label}</EntityLink> },
    { id: "amount", header: "Valor", phone: "hidden", align: "right", sortValue: (o) => o.amount, cell: (o) => <MoneyText value={o.amount} /> },
    { id: "open", header: "Em aberto", phone: "value", align: "right", sortValue: (o) => o.open, cell: (o) => <MoneyText value={o.open} tone={o.overdue && o.open > 0 ? "danger" : undefined} /> },
    { id: "due", header: "Vencimento", phone: "meta", sortValue: (o) => obligationDue(o) ?? "", cell: (o) => <DateText value={obligationDue(o)} tone={o.overdue && o.open > 0 ? "danger" : undefined} /> },
    { id: "status", header: "Situação", phone: "badge", cell: (o) => <StatusBadge kind="obligation" value={o.status} overdue={o.overdue && o.status !== "SETTLED"} /> },
    {
      id: "action",
      header: verb,
      phone: "meta",
      align: "right",
      cell: (o) => (o.open > 0 ? <Button type="button" size="sm" variant="outline" className="relative z-10" onClick={() => settle.open({ obligations: [o], onClosed: () => void refresh() })}>{verb}</Button> : null),
    },
  ];

  const partyType = v.counterparty_type;
  const total = list?.total ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{receiving ? "A receber" : "A pagar"}</h1>
        <Button type="button" disabled={chosen.length === 0} onClick={() => settle.open({ obligations: chosen, onClosed: () => { setSelected(new Set()); void refresh(); } })}>
          {verb} {chosen.length > 0 ? `${chosen.length} ${chosen.length === 1 ? "conta" : "contas"} · ${formatMoney(chosenTotal)}` : "selecionadas"}
        </Button>
      </div>

      <FilterBar
        chips={[
          { label: "Vencimento", options: OBLIGATION_CHIPS, value: v.quando || DEFAULT_WHEN, onChange: (quando) => changeFilters({ quando }) },
          { label: "Visão", options: OBLIGATION_GROUPINGS, value: v.agrupar, onChange: (agrupar) => changeFilters({ agrupar }) },
        ]}
        activeCount={(v.quando ? 1 : 0) + (v.counterparty_id ? 1 : 0) + (v.agrupar ? 1 : 0)}
        onClear={() => changeFilters({ quando: "", counterparty_type: "", counterparty_id: "", agrupar: "" })}
      >
        {receiving ? (
          <FieldShell label="Cliente" htmlFor="of-customer">
            <EntityCombobox kind="customer" id="of-customer" value={partyType === "CUSTOMER" ? v.counterparty_id : ""} allowCreate={false} placeholder="Todos os clientes" onChange={(id) => changeFilters({ counterparty_type: id ? "CUSTOMER" : "", counterparty_id: id })} />
          </FieldShell>
        ) : (
          <>
            <FieldShell label="Fornecedor ou prestador" htmlFor="of-supplier">
              <EntityCombobox kind="supplier" id="of-supplier" value={partyType === "SUPPLIER" ? v.counterparty_id : ""} allowCreate={false} placeholder="Todos os credores" onChange={(id) => changeFilters({ counterparty_type: id ? "SUPPLIER" : "", counterparty_id: id })} />
            </FieldShell>
            <FieldShell label="Parceiro (comissões)" htmlFor="of-partner">
              <EntityCombobox kind="partner" id="of-partner" value={partyType === "PARTNER" ? v.counterparty_id : ""} allowCreate={false} placeholder="Nenhum" onChange={(id) => changeFilters({ counterparty_type: id ? "PARTNER" : "", counterparty_id: id })} />
            </FieldShell>
          </>
        )}
      </FilterBar>

      <DataTable
        caption={receiving ? "Contas a receber" : "Contas a pagar"}
        columns={columns}
        rows={rows}
        rowKey={(o) => o.id}
        rowHref={(o) => `/contas/${o.id}`}
        isLoading={isLoading}
        error={error}
        onRetry={() => void refresh()}
        empty={{ title: receiving ? "Nada a receber com esses filtros." : "Nada a pagar com esses filtros.", description: "Tudo em dia." }}
        defaultSort={grouped ? null : { id: "due", dir: "asc" }}
        grouping={grouped ? {
          keyOf: counterpartyKey,
          label: (_k, g) => `${formatCounterparty(g[0].counterparty)} · ${g.length}`,
          summary: (_k, g) => `${formatMoney(groupSummary(g).open)} em aberto${groupSummary(g).overdue > 0 ? ` · ${groupSummary(g).overdue} vencida(s)` : ""}`,
          actions: (_k, g) => {
            const s = groupSummary(g);
            return s.payable.length > 0 ? (
              <Button type="button" size="sm" variant="outline" onClick={() => settle.open({ obligations: s.payable, onClosed: () => void refresh() })}>
                {verb} tudo{receiving ? " deste cliente" : " deste credor"}
              </Button>
            ) : null;
          },
          lastKeys: ["none"],
        } : undefined}
        summary={list ? <span className="flex flex-wrap justify-between gap-x-6">Valor {formatMoney(list.totals.amount)} · Quitado {formatMoney(list.totals.settled)} · Em aberto {formatMoney(list.totals.open)}</span> : undefined}
      />

      {list && total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{pageLabel(filters.offset, total)}</span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={filters.offset === 0} onClick={() => f.set({ offset: String(Math.max(filters.offset - PAGE_SIZE, 0)) })}>Anterior</Button>
            <Button type="button" variant="outline" disabled={!list.has_more} onClick={() => f.set({ offset: String(filters.offset + PAGE_SIZE) })}>Próxima</Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** A receber / A pagar (T14): chips de vencimento, credor por combobox (inclui Partners), agrupar por credor, seleção múltipla. */
export function ObligationsPage({ direction }: { direction: ObligationDirection }) {
  return (
    <Suspense fallback={null}>
      <Content direction={direction} />
    </Suspense>
  );
}
