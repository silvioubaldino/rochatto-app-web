"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSWRConfig } from "swr";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { api, APIError } from "@/lib/api";
import { useFinancialMovements } from "@/hooks/useFinancialMovements";
import { isAccountingKey } from "@/hooks/useObligations";
import {
  PAGE_SIZE,
  movementFiltersToParams,
  parseMovementFilters,
  type MovementFilters,
} from "@/lib/obligations";
import { validateFinancePeriod } from "@/lib/finance";
import { MOVEMENT_CATEGORY_LABELS, formatMoeda } from "@/lib/formatters";
import type { FinancialMovement, MovementCategory } from "@/lib/types";
import { MovementForm } from "@/components/movements/MovementForm";
import { MovementTable } from "@/components/movements/MovementTable";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { SELECT_CLASS } from "@/components/obligations/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Movimentações — AYD-007 §4: dinheiro executado (entrada +, saída −).

const CATEGORIES = Object.keys(MOVEMENT_CATEGORY_LABELS) as MovementCategory[];

function MovimentacoesView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mutate } = useSWRConfig();
  const [filters, setFilters] = useState<MovementFilters>(() => parseMovementFilters(searchParams));
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FinancialMovement | undefined>();
  const [voiding, setVoiding] = useState<FinancialMovement | null>(null);

  const periodError = validateFinancePeriod({ from: filters.from, to: filters.to });
  const { list, isLoading, error, refresh } = useFinancialMovements(periodError ? null : filters);

  useEffect(() => {
    router.replace(`/movimentacoes?${movementFiltersToParams(filters).toString()}`, { scroll: false });
  }, [filters, router]);

  function update(patch: Partial<MovementFilters>) {
    setFilters((f) => ({ ...f, offset: 0, ...patch }));
  }

  function refreshAll() {
    refresh();
    mutate(isAccountingKey);
  }

  async function confirmVoid() {
    if (!voiding) return;
    try {
      await api.delete(`/financial-movements/${voiding.id}`);
      toast.success("Movimentação anulada.");
      refreshAll();
    } catch (err) {
      toast.error(err instanceof APIError ? err.message : "Erro ao anular a movimentação.");
    } finally {
      setVoiding(null);
    }
  }

  const totals = list?.totals;
  const total = list?.total ?? 0;
  const from = total === 0 ? 0 : filters.offset + 1;
  const to = Math.min(filters.offset + PAGE_SIZE, total);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Movimentações</h1>
        <Button
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Nova movimentação
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label htmlFor="mv_from" className="text-xs font-medium text-muted-foreground">
            De
          </label>
          <Input
            id="mv_from"
            type="date"
            value={filters.from}
            onChange={(e) => update({ from: e.target.value })}
            className="h-8 w-36"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="mv_to" className="text-xs font-medium text-muted-foreground">
            Até
          </label>
          <Input
            id="mv_to"
            type="date"
            value={filters.to}
            onChange={(e) => update({ to: e.target.value })}
            className="h-8 w-36"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="mv_cat" className="text-xs font-medium text-muted-foreground">
            Categoria
          </label>
          <select
            id="mv_cat"
            value={filters.category ?? ""}
            onChange={(e) => update({ category: (e.target.value || undefined) as MovementCategory | undefined })}
            className={`${SELECT_CLASS} w-48`}
          >
            <option value="">Todas</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {MOVEMENT_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="mv_dir" className="text-xs font-medium text-muted-foreground">
            Sentido
          </label>
          <select
            id="mv_dir"
            value={filters.direction ?? ""}
            onChange={(e) => update({ direction: (e.target.value || undefined) as MovementFilters["direction"] })}
            className={`${SELECT_CLASS} w-36`}
          >
            <option value="">Todos</option>
            <option value="IN">Entradas</option>
            <option value="OUT">Saídas</option>
          </select>
        </div>
        <label className="flex h-8 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={filters.unallocated_only}
            onChange={(e) => update({ unallocated_only: e.target.checked })}
          />
          Só sem alocação
        </label>
      </div>
      {periodError && <p className="text-xs text-destructive">{periodError}</p>}

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="text-destructive">
            {error instanceof Error ? error.message : "Erro ao carregar as movimentações."}
          </p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => refresh()}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <MovementTable
          items={list?.items ?? []}
          isLoading={isLoading && !periodError}
          onEdit={(m) => {
            setEditing(m);
            setFormOpen(true);
          }}
          onVoid={setVoiding}
        />
      )}

      {totals && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
          <span>
            Entradas: <strong className="text-green-600">{formatMoeda(totals.inflow)}</strong>
          </span>
          <span>
            Saídas: <strong className="text-destructive">{formatMoeda(totals.outflow)}</strong>
          </span>
          <span>
            Saldo:{" "}
            <strong className={totals.net < 0 ? "text-destructive" : "text-green-600"}>
              {formatMoeda(totals.net)}
            </strong>
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

      <MovementForm open={formOpen} onClose={() => setFormOpen(false)} movement={editing} onDone={refreshAll} />

      <DeleteConfirmDialog
        open={!!voiding}
        onClose={() => setVoiding(null)}
        onConfirm={confirmVoid}
        title="Anular movimentação"
        confirmLabel="Anular"
        description="As quitações ligadas a esta movimentação serão desfeitas e as contas voltam a ficar em aberto. A movimentação sai da lista."
      />
    </div>
  );
}

export default function MovimentacoesPage() {
  return (
    <Suspense fallback={null}>
      <MovimentacoesView />
    </Suspense>
  );
}
