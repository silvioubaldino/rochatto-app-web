"use client";

import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { MOVEMENT_CATEGORY_LABELS, formatData, formatMoeda, formatPaymentMethod } from "@/lib/formatters";
import type { FinancialMovement } from "@/lib/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface MovementTableProps {
  items: FinancialMovement[];
  isLoading?: boolean;
  onEdit: (m: FinancialMovement) => void;
  onVoid: (m: FinancialMovement) => void;
}

export function MovementTable({ items, isLoading, onEdit, onVoid }: MovementTableProps) {
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
        Nenhuma movimentação no período.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left text-muted-foreground">
            <th className="px-3 py-2 font-medium">Data</th>
            <th className="px-3 py-2 text-right font-medium">Valor</th>
            <th className="px-3 py-2 font-medium">Categoria</th>
            <th className="px-3 py-2 font-medium">Forma</th>
            <th className="px-3 py-2 font-medium">Contraparte / descrição</th>
            <th className="px-3 py-2 font-medium">Alocação</th>
            <th className="w-20 px-3 py-2 font-medium">Ações</th>
          </tr>
        </thead>
        <tbody>
          {items.map((m) => (
            <tr key={m.id} className="border-b last:border-b-0 hover:bg-muted/30">
              <td className="px-3 py-2 whitespace-nowrap">{formatData(m.occurred_on)}</td>
              <td
                className={cn(
                  "px-3 py-2 text-right font-medium tabular-nums whitespace-nowrap",
                  m.amount > 0 ? "text-green-600" : "text-destructive",
                )}
              >
                {m.amount > 0 ? "+" : ""}
                {formatMoeda(m.amount)}
              </td>
              <td className="px-3 py-2">
                <span className="flex flex-wrap items-center gap-1">
                  {MOVEMENT_CATEGORY_LABELS[m.category] ?? "—"}
                  {m.corrected_at && (
                    <StatusBadge
                      label="Corrigida"
                      colorClassName="bg-gray-200 text-gray-700"
                      title={`Corrigida em ${formatData(m.corrected_at)}`}
                    />
                  )}
                </span>
              </td>
              <td className="px-3 py-2">{formatPaymentMethod(m.payment_method)}</td>
              <td className="px-3 py-2">
                <p>{m.counterparty_name || "—"}</p>
                {m.description && <p className="max-w-xs truncate text-xs text-muted-foreground">{m.description}</p>}
              </td>
              <td className="px-3 py-2">
                <span className="flex flex-wrap items-center gap-1">
                  {m.unallocated > 0 && (
                    <StatusBadge
                      label={`Sem alocação · ${formatMoeda(m.unallocated)}`}
                      colorClassName="bg-orange-100 text-orange-800"
                      title="Parte do valor não quita nenhuma conta"
                    />
                  )}
                  {m.settlements.map((s) => (
                    <Link
                      key={s.id}
                      href={`/contas/${s.obligation_id}`}
                      className="text-xs text-primary hover:underline"
                    >
                      {formatMoeda(s.amount)}
                    </Link>
                  ))}
                </span>
              </td>
              <td className="px-3 py-2">
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon-xs" onClick={() => onEdit(m)} title="Corrigir">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon-xs" onClick={() => onVoid(m)} title="Anular">
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
