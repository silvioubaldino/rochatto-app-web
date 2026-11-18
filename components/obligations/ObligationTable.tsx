"use client";

import Link from "next/link";
import { formatCounterparty, formatData, formatMoeda, obligationOriginHref } from "@/lib/formatters";
import { isSelectable } from "@/lib/obligations";
import type { Obligation } from "@/lib/types";
import { ObligationStatusBadge, OverdueBadge } from "@/components/status-badges";
import { Skeleton } from "@/components/ui/skeleton";

interface ObligationTableProps {
  items: Obligation[];
  isLoading?: boolean;
  /** Rótulo da primeira coluna: "Credor" (a pagar) ou "Cliente" (a receber). */
  partyLabel: string;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (checked: boolean) => void;
}

export function ObligationTable({
  items,
  isLoading,
  partyLabel,
  selected,
  onToggle,
  onToggleAll,
}: ObligationTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2" aria-busy="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="rounded-lg border py-12 text-center text-sm text-muted-foreground">
        Nenhuma conta encontrada.
      </p>
    );
  }

  const selectable = items.filter(isSelectable);
  const allSelected = selectable.length > 0 && selectable.every((o) => selected.has(o.id));

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left text-muted-foreground">
            <th className="w-10 px-3 py-2">
              <input
                type="checkbox"
                aria-label="Selecionar todas"
                checked={allSelected}
                disabled={selectable.length === 0}
                onChange={(e) => onToggleAll(e.target.checked)}
              />
            </th>
            <th className="px-3 py-2 font-medium">{partyLabel}</th>
            <th className="px-3 py-2 font-medium">Origem</th>
            <th className="px-3 py-2 text-right font-medium">Valor</th>
            <th className="px-3 py-2 text-right font-medium">Em aberto</th>
            <th className="px-3 py-2 font-medium">Vencimento</th>
            <th className="px-3 py-2 font-medium">Situação</th>
          </tr>
        </thead>
        <tbody>
          {items.map((o) => {
            const due = o.next_installment?.due_date ?? o.due_date;
            return (
              <tr key={o.id} className="border-b last:border-b-0 hover:bg-muted/30">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    aria-label={`Selecionar conta de ${formatCounterparty(o.counterparty)}`}
                    checked={selected.has(o.id)}
                    disabled={!isSelectable(o)}
                    onChange={() => onToggle(o.id)}
                  />
                </td>
                <td className="px-3 py-2 font-medium">
                  <Link href={`/contas/${o.id}`} className="text-primary hover:underline">
                    {formatCounterparty(o.counterparty)}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <Link href={obligationOriginHref(o.origin)} className="hover:underline">
                    {o.origin.label}
                  </Link>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{formatMoeda(o.amount)}</td>
                <td className="px-3 py-2 text-right tabular-nums font-medium">{formatMoeda(o.open)}</td>
                <td className="px-3 py-2">{due ? formatData(due) : "—"}</td>
                <td className="px-3 py-2">
                  <span className="flex flex-wrap gap-1">
                    <ObligationStatusBadge status={o.status} />
                    {o.overdue && <OverdueBadge />}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
