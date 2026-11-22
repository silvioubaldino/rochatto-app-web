"use client";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/patterns/StatusBadge";
import { DateText, MoneyText } from "@/components/patterns/values";
import { MovementPaymentLabel } from "./MovementPaymentLabel";
import type { Obligation } from "@/lib/types";
import { useObligationDetail } from "../queries";

/** Recebimento (T06 §3): plano com cobertura, quitações, Receber e Definir plano. */
export function SaleReceivableCard({
  receivable,
  readOnly,
  onReceive,
  onDefinePlan,
}: {
  receivable: Obligation | null;
  readOnly: boolean;
  onReceive: (o: Obligation) => void;
  onDefinePlan: () => void;
}) {
  const detail = useObligationDetail(receivable?.id);
  if (!receivable) return null;
  const o = detail ?? receivable;
  return (
    <section id="sale-receivable" aria-labelledby="sale-receivable-h" className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="sale-receivable-h" className="text-sm font-semibold">Recebimento</h2>
        <StatusBadge kind="obligation" value={o.status} />
        {o.overdue && <StatusBadge tone="danger">Vencida</StatusBadge>}
      </div>
      <dl className="grid grid-cols-3 gap-2 text-sm">
        <div><dt className="text-xs text-muted-foreground">Valor</dt><dd><MoneyText value={o.amount} /></dd></div>
        <div><dt className="text-xs text-muted-foreground">Recebido</dt><dd><MoneyText value={o.settled} tone="success" /></dd></div>
        <div><dt className="text-xs text-muted-foreground">Em aberto</dt><dd><MoneyText value={o.open} tone={o.open > 0 ? "warning" : undefined} /></dd></div>
      </dl>

      {(o.installments?.length ?? 0) > 0 ? (
        <ul aria-label="Parcelas" className="divide-y text-sm">
          {o.installments?.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
              <DateText value={i.due_date.slice(0, 10)} tone={i.overdue ? "danger" : undefined} />
              <MoneyText value={i.amount} />
              <StatusBadge kind="installment" value={i.status} overdue={i.overdue && i.status !== "COVERED"} />
            </li>
          ))}
        </ul>
      ) : (
        o.open > 0 && <p className="text-sm text-muted-foreground">Sem plano de parcelas.</p>
      )}

      {(o.settlements?.length ?? 0) > 0 && (
        <ul aria-label="Quitações" className="divide-y text-sm">
          {o.settlements?.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-x-3 py-2">
              <DateText value={s.movement.occurred_on.slice(0, 10)} />
              <MoneyText value={s.amount} tone="success" />
              <MovementPaymentLabel method={s.movement.payment_method} />
            </li>
          ))}
        </ul>
      )}

      {!readOnly && (
        <div className="flex flex-wrap gap-2">
          {o.open > 0 && <Button size="sm" onClick={() => onReceive(o)}>Receber</Button>}
          <Button size="sm" variant="outline" onClick={onDefinePlan}>{(o.installments?.length ?? 0) > 0 ? "Alterar plano" : "Definir plano"}</Button>
        </div>
      )}
    </section>
  );
}
