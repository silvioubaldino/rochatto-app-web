"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSWRConfig } from "swr";
import { X } from "lucide-react";
import { useObligations, isAccountingKey } from "@/hooks/useObligations";
import { useFornecedores } from "@/hooks/useFornecedores";
import { useClientes } from "@/hooks/useClientes";
import {
  ALL_STATUSES,
  OPEN_STATUSES,
  PAGE_SIZE,
  obligationFiltersToParams,
  parseObligationFilters,
  sameDirection,
  type ObligationFilters,
} from "@/lib/obligations";
import { DIRECTION_LABELS, OBLIGATION_STATUS_LABELS, formatMoeda } from "@/lib/formatters";
import { ObligationTable } from "@/components/obligations/ObligationTable";
import { BulkSettleDialog } from "@/components/obligations/BulkSettleDialog";
import { SELECT_CLASS } from "@/components/obligations/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Contas a pagar / a receber — AYD-007 §2.

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: OPEN_STATUSES, label: "Em aberto (aberta + parcial)" },
  { value: "OPEN", label: OBLIGATION_STATUS_LABELS.OPEN },
  { value: "PARTIAL", label: OBLIGATION_STATUS_LABELS.PARTIAL },
  { value: "SETTLED", label: OBLIGATION_STATUS_LABELS.SETTLED },
  { value: ALL_STATUSES, label: "Todas" },
];

const BASE_PATHS = { RECEIVABLE: "/contas/receber", PAYABLE: "/contas/pagar" } as const;

/** A receber (`/contas/receber`) ou A pagar (`/contas/pagar`) — AYD-011 §5.1, AYD-007 §2. */
export function ObligationsView({ direction }: { direction: ObligationFilters["direction"] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mutate } = useSWRConfig();
  const [filters, setFilters] = useState<ObligationFilters>(() => ({ ...parseObligationFilters(searchParams), direction }));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);

  const { list, isLoading, error, refresh } = useObligations(filters);
  const { fornecedores } = useFornecedores();
  const { clientes } = useClientes();

  const receiving = filters.direction === "RECEIVABLE";

  // Reflete os filtros na URL (compartilhável / sobrevive ao recarregar)
  useEffect(() => {
    const params = obligationFiltersToParams(filters);
    params.delete("direction"); // a direção é a rota
    const qs = params.toString();
    router.replace(qs ? `${BASE_PATHS[direction]}?${qs}` : BASE_PATHS[direction], { scroll: false });
  }, [filters, direction, router]);

  function update(patch: Partial<ObligationFilters>) {
    setSelected(new Set());
    setFilters((f) => ({ ...f, offset: 0, ...patch }));
  }

  function changeDirection(next: ObligationFilters["direction"]) {
    // Credor de uma direção não faz sentido na outra: a rota muda e os filtros do credor saem.
    if (next !== direction) router.push(BASE_PATHS[next]);
  }

  const items = useMemo(() => list?.items ?? [], [list]);
  const selectedItems = useMemo(() => items.filter((o) => selected.has(o.id)), [items, selected]);
  const canBulk = selectedItems.length > 0 && sameDirection(selectedItems);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(items.filter((o) => o.open > 0).map((o) => o.id)) : new Set());
  }

  function refreshAll() {
    setSelected(new Set());
    refresh();
    mutate(isAccountingKey);
  }

  const counterpartyValue =
    filters.counterparty_type && filters.counterparty_id
      ? `${filters.counterparty_type}:${filters.counterparty_id}`
      : "";

  const counterpartyOptions = receiving
    ? clientes.map((c) => ({ value: `CUSTOMER:${c.id}`, label: c.nome }))
    : fornecedores.map((f) => ({ value: `SUPPLIER:${f.id}`, label: f.nome }));
  const knownCounterparty = counterpartyOptions.some((o) => o.value === counterpartyValue);

  function changeCounterparty(value: string) {
    if (!value) return update({ counterparty_type: undefined, counterparty_id: undefined });
    const [type, id] = value.split(":");
    update({ counterparty_type: type as ObligationFilters["counterparty_type"], counterparty_id: id });
  }

  const totals = list?.totals;
  const total = list?.total ?? 0;
  const from = total === 0 ? 0 : filters.offset + 1;
  const to = Math.min(filters.offset + PAGE_SIZE, total);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{receiving ? "A receber" : "A pagar"}</h1>
        <Button disabled={!canBulk} onClick={() => setBulkOpen(true)}>
          {receiving ? "Receber várias contas" : "Pagar várias contas"}
          {selectedItems.length > 0 && ` (${selectedItems.length})`}
        </Button>
      </div>

      <Tabs value={filters.direction} onValueChange={(v) => changeDirection(v === "RECEIVABLE" ? "RECEIVABLE" : "PAYABLE")}>
        <TabsList>
          <TabsTrigger value="PAYABLE">{DIRECTION_LABELS.PAYABLE}</TabsTrigger>
          <TabsTrigger value="RECEIVABLE">{DIRECTION_LABELS.RECEIVABLE}</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label htmlFor="ob-status" className="text-xs font-medium text-muted-foreground">
            Situação
          </label>
          <select
            id="ob-status"
            value={filters.status}
            onChange={(e) => update({ status: e.target.value })}
            className={`${SELECT_CLASS} w-56`}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="ob-party" className="text-xs font-medium text-muted-foreground">
            {receiving ? "Cliente" : "Credor"}
          </label>
          <select
            id="ob-party"
            value={counterpartyValue}
            onChange={(e) => changeCounterparty(e.target.value)}
            className={`${SELECT_CLASS} w-56`}
          >
            <option value="">Todos</option>
            {counterpartyValue && !knownCounterparty && <option value={counterpartyValue}>Filtro da URL</option>}
            {counterpartyOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="ob-due" className="text-xs font-medium text-muted-foreground">
            Vence até
          </label>
          <div className="flex items-center gap-1">
            <Input
              id="ob-due"
              type="date"
              value={filters.due_to ?? ""}
              onChange={(e) => update({ due_to: e.target.value || undefined })}
              className="h-8 w-36"
            />
            {filters.due_to && (
              <button
                type="button"
                onClick={() => update({ due_to: undefined })}
                className="text-muted-foreground hover:text-foreground"
                title="Limpar"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        <label className="flex h-8 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={filters.overdue}
            onChange={(e) => update({ overdue: e.target.checked })}
          />
          Só vencidas
        </label>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="text-destructive">
            {error instanceof Error ? error.message : "Erro ao carregar as contas."}
          </p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => refresh()}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <ObligationTable
          items={items}
          isLoading={isLoading}
          partyLabel={receiving ? "Cliente" : "Credor"}
          selected={selected}
          onToggle={toggle}
          onToggleAll={toggleAll}
        />
      )}

      {totals && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
          <span>
            Valor: <strong>{formatMoeda(totals.amount)}</strong>
          </span>
          <span>
            Quitado: <strong className="text-green-600">{formatMoeda(totals.settled)}</strong>
          </span>
          <span>
            Em aberto: <strong className="text-orange-600">{formatMoeda(totals.open)}</strong>
          </span>
        </div>
      )}

      {list && total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {from}–{to} de {total}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={filters.offset === 0}
              onClick={() => update({ offset: Math.max(filters.offset - PAGE_SIZE, 0) })}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!list.has_more}
              onClick={() => update({ offset: filters.offset + PAGE_SIZE })}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      <BulkSettleDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        obligations={selectedItems}
        onDone={refreshAll}
      />
    </div>
  );
}

