"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityLink } from "@/components/entity/EntityLink";
import { ActionsMenu } from "@/components/patterns/ActionsMenu";
import { ConfirmDialog } from "@/components/patterns/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/patterns/DataTable";
import { FieldShell } from "@/components/patterns/fields";
import { FilterBar } from "@/components/patterns/FilterBar";
import { PeriodSelector } from "@/components/patterns/PeriodSelector";
import { Select } from "@/components/patterns/Select";
import { StatusBadge } from "@/components/patterns/StatusBadge";
import { useUrlFilters } from "@/components/patterns/useUrlFilters";
import { DateText, MoneyText } from "@/components/patterns/values";
import { MOVEMENT_CATEGORY_LABELS, PAYMENT_METHOD_LABELS, formatDate, formatMoney } from "@/lib/format";
import { PAGE_SIZE } from "@/lib/obligations";
import type { FinancialMovement, MovementCategory } from "@/lib/types";
import {
  MOVEMENT_ALLOCATION_CHIPS,
  MOVEMENT_DIRECTION_CHIPS,
  movementFiltersFromUrl,
  movementKindOf,
  movementPeriodError,
  pageLabel,
  type MovementKind,
} from "../model";
import { useVoidMovementConfirmed } from "../mutations";
import { useFinancialMovements } from "../queries";
import { MovementDialog } from "./MovementDialog";

// `unallocated_only` é o parâmetro antigo (links já compartilhados); `alocacao=sem` é o atual.
const SPEC = { from: {}, to: {}, category: {}, direction: {}, alocacao: {}, unallocated_only: {}, offset: {}, nova: {} } as const;
const CATEGORY_OPTIONS = [{ value: "", label: "Todas" }, ...(Object.keys(MOVEMENT_CATEGORY_LABELS) as MovementCategory[]).map((c) => ({ value: c, label: MOVEMENT_CATEGORY_LABELS[c] }))];

type Editing = { kind: MovementKind; movement?: FinancialMovement } | null;

function Content() {
  const params = useSearchParams();
  const f = useUrlFilters(SPEC);
  const v = f.values;
  const filters = movementFiltersFromUrl(v);
  const periodError = movementPeriodError(filters);
  const { list, isLoading, error, refresh } = useFinancialMovements(periodError ? null : filters);
  const voidMovement = useVoidMovementConfirmed();
  const [editing, setEditing] = useState<Editing>(() => (v.nova === "despesa" ? { kind: "EXPENSE" } : v.nova === "receita" ? { kind: "INCOME" } : null));
  const [voiding, setVoiding] = useState<FinancialMovement | null>(null);

  function closeDialog() {
    setEditing(null);
    if (params.get("nova")) f.set({ nova: "" });
  }

  const columns: DataTableColumn<FinancialMovement>[] = [
    { id: "date", header: "Data", phone: "title", sortValue: (m) => m.occurred_on, cell: (m) => <DateText value={m.occurred_on.slice(0, 10)} /> },
    { id: "amount", header: "Valor", phone: "value", align: "right", sortValue: (m) => m.amount, cell: (m) => <span className={m.amount > 0 ? "text-success" : "text-danger"}>{m.amount > 0 ? "+" : ""}<MoneyText value={m.amount} tone={m.amount > 0 ? "success" : "danger"} /></span> },
    {
      id: "category",
      header: "Categoria",
      phone: "subtitle",
      cell: (m) => (
        <span className="inline-flex flex-wrap items-center gap-1.5">
          {MOVEMENT_CATEGORY_LABELS[m.category] ?? "—"}
          {m.corrected_at && <StatusBadge tone="neutral" title={`Corrigida em ${formatDate(m.corrected_at)}`}>Corrigida</StatusBadge>}
        </span>
      ),
    },
    { id: "method", header: "Forma", phone: "meta", cell: (m) => (m.payment_method ? PAYMENT_METHOD_LABELS[m.payment_method] : "—") },
    { id: "party", header: "Contraparte / descrição", phone: "meta", cell: (m) => <span>{m.counterparty_name || "—"}{m.description && <span className="block max-w-xs truncate text-xs text-muted-foreground">{m.description}</span>}</span> },
    {
      id: "allocation",
      header: "Alocação",
      phone: "badge",
      cell: (m) => (
        <span className="relative z-10 flex flex-wrap items-center gap-1.5">
          {m.unallocated > 0 && <StatusBadge tone="warning" title="Parte do valor não quita nenhuma conta">{`Sem alocação · ${formatMoney(m.unallocated)}`}</StatusBadge>}
          {m.settlements.map((s) => <EntityLink key={s.id} type="obligation" id={s.obligation_id} mode="peek" className="text-xs">{formatMoney(s.amount)}</EntityLink>)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Ações",
      phone: "meta",
      align: "right",
      cell: (m) => (
        <span className="relative z-10 inline-flex">
          <ActionsMenu label={`Ações da movimentação de ${formatMoney(m.amount)}`} items={[
            { id: "edit", label: "Corrigir", onSelect: () => setEditing({ kind: movementKindOf(m), movement: m }) },
            { id: "void", label: "Anular", danger: true, onSelect: () => setVoiding(m) },
          ]} />
        </span>
      ),
    },
  ];

  const total = list?.total ?? 0;
  const totals = list?.totals;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Movimentações</h1>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => setEditing({ kind: "EXPENSE" })}><Plus aria-hidden />Despesa</Button>
          <Button type="button" variant="outline" onClick={() => setEditing({ kind: "INCOME" })}><Plus aria-hidden />Receita avulsa</Button>
        </div>
      </div>

      <PeriodSelector period={{ from: filters.from, to: filters.to }} onChange={(p) => f.set({ from: p.from, to: p.to, offset: "" })} />
      {periodError && <p role="alert" className="text-xs text-destructive">{periodError}</p>}
      <FilterBar
        chips={[
          { label: "Sentido", options: MOVEMENT_DIRECTION_CHIPS, value: v.direction, onChange: (direction) => f.set({ direction, offset: "" }) },
          { label: "Alocação", options: MOVEMENT_ALLOCATION_CHIPS, value: filters.unallocated_only ? "sem" : "", onChange: (alocacao) => f.set({ alocacao, unallocated_only: "", offset: "" }) },
        ]}
        activeCount={(v.direction ? 1 : 0) + (filters.unallocated_only ? 1 : 0) + (v.category ? 1 : 0)}
        onClear={() => f.set({ direction: "", alocacao: "", unallocated_only: "", category: "", offset: "" })}
      >
        <FieldShell label="Categoria" htmlFor="mf-category"><Select id="mf-category" value={v.category} onChange={(category) => f.set({ category, offset: "" })} options={CATEGORY_OPTIONS} /></FieldShell>
      </FilterBar>

      <DataTable
        caption="Movimentações"
        columns={columns}
        rows={list?.items ?? []}
        rowKey={(m) => m.id}
        isLoading={isLoading && !periodError}
        error={error}
        onRetry={() => void refresh()}
        defaultSort={{ id: "date", dir: "desc" }}
        empty={{ title: "Nenhuma movimentação no período.", action: { label: "Lançar despesa", onClick: () => setEditing({ kind: "EXPENSE" }) } }}
        summary={totals ? <span className="flex flex-wrap justify-between gap-x-6">Entradas {formatMoney(totals.inflow)} · Saídas {formatMoney(totals.outflow)} · Saldo {formatMoney(totals.net)}</span> : undefined}
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

      {editing && <MovementDialog kind={editing.kind} movement={editing.movement} onClose={closeDialog} />}
      <ConfirmDialog
        open={!!voiding}
        onOpenChange={(o) => !o && setVoiding(null)}
        tone="danger"
        title="Anular movimentação"
        description="As quitações ligadas a esta movimentação serão desfeitas e as contas voltam a ficar em aberto. A movimentação sai da lista."
        confirmLabel="Anular"
        onConfirm={() => voidMovement.mutateAsync((voiding as FinancialMovement).id)}
      />
    </div>
  );
}

export function MovementsPage() {
  return (
    <Suspense fallback={null}>
      <Content />
    </Suspense>
  );
}
