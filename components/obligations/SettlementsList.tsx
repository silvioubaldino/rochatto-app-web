"use client";

import { Undo2 } from "lucide-react";
import {
  MOVEMENT_CATEGORY_LABELS,
  formatData,
  formatMoeda,
  formatPaymentMethod,
} from "@/lib/formatters";
import type { ObligationSettlement } from "@/lib/types";
import { Button } from "@/components/ui/button";

interface SettlementsListProps {
  settlements: ObligationSettlement[];
  /** Sem `onUndo` a lista é somente leitura. */
  onUndo?: (settlement: ObligationSettlement) => void;
}

/** Quitações da conta (dinheiro que de fato se moveu). */
export function SettlementsList({ settlements, onUndo }: SettlementsListProps) {
  if (settlements.length === 0) {
    return <p className="py-3 text-sm text-muted-foreground">Nenhuma quitação registrada.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-2 pr-4 font-medium">Data</th>
            <th className="pb-2 pr-4 text-right font-medium">Quitado</th>
            <th className="pb-2 pr-4 font-medium">Forma</th>
            <th className="pb-2 pr-4 font-medium">Categoria</th>
            <th className="pb-2 pr-4 text-right font-medium">Movimentação</th>
            {onUndo && <th className="w-16 pb-2 font-medium">Ações</th>}
          </tr>
        </thead>
        <tbody>
          {settlements.map((s) => (
            <tr key={s.id} className="border-b last:border-b-0">
              <td className="py-2 pr-4">{formatData(s.movement.occurred_on)}</td>
              <td className="py-2 pr-4 text-right font-medium tabular-nums">{formatMoeda(s.amount)}</td>
              <td className="py-2 pr-4">{formatPaymentMethod(s.movement.payment_method)}</td>
              <td className="py-2 pr-4">{MOVEMENT_CATEGORY_LABELS[s.movement.category] ?? "—"}</td>
              <td className="py-2 pr-4 text-right tabular-nums text-muted-foreground">
                {formatMoeda(s.movement.amount)}
              </td>
              {onUndo && (
                <td className="py-2">
                  <Button variant="ghost" size="icon-xs" onClick={() => onUndo(s)} title="Desfazer quitação">
                    <Undo2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
