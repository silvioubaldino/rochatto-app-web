"use client";

import { formatData, formatMoeda, formatPaymentMethod } from "@/lib/formatters";
import type { Installment } from "@/lib/types";
import { InstallmentStatusBadge, OverdueBadge } from "@/components/status-badges";

/** Plano de parcelas com cobertura (calculada pela API). */
export function InstallmentsList({ installments }: { installments: Installment[] }) {
  if (installments.length === 0) {
    return <p className="py-3 text-sm text-muted-foreground">Sem parcelas definidas.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-2 pr-4 font-medium">Vencimento</th>
            <th className="pb-2 pr-4 text-right font-medium">Valor</th>
            <th className="pb-2 pr-4 text-right font-medium">Coberto</th>
            <th className="pb-2 pr-4 font-medium">Forma</th>
            <th className="pb-2 font-medium">Situação</th>
          </tr>
        </thead>
        <tbody>
          {installments.map((i) => (
            <tr key={i.id} className="border-b last:border-b-0">
              <td className="py-2 pr-4">{formatData(i.due_date)}</td>
              <td className="py-2 pr-4 text-right tabular-nums">{formatMoeda(i.amount)}</td>
              <td className="py-2 pr-4 text-right tabular-nums">{formatMoeda(i.covered)}</td>
              <td className="py-2 pr-4">{formatPaymentMethod(i.payment_method)}</td>
              <td className="py-2">
                <span className="flex flex-wrap gap-1">
                  <InstallmentStatusBadge status={i.status} />
                  {i.overdue && <OverdueBadge />}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
