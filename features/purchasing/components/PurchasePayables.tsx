"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/patterns/StatusBadge";
import { MoneyText } from "@/components/patterns/values";
import { formatCounterparty } from "@/lib/format";
import type { Obligation } from "@/lib/types";

export function PurchasePayables({ payables, onPay }: { payables: readonly Obligation[]; onPay: (o: Obligation) => void }) {
  return (
    <section id="purchase-payables" aria-labelledby="purchase-payables-h" className="space-y-2 rounded-lg border bg-card p-4">
      <h2 id="purchase-payables-h" className="text-sm font-semibold">Contas a pagar da compra</h2>
      {payables.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">Nenhuma conta nesta compra.</p>
      ) : (
        <ul className="divide-y">
          {payables.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2 text-sm">
              <Link href={`/contas/${o.id}`} className="min-w-0 flex-1 basis-40 font-medium hover:underline">{formatCounterparty(o.counterparty)}</Link>
              <StatusBadge kind="obligation" value={o.status} overdue={o.overdue && o.status !== "SETTLED"} />
              <span className="text-muted-foreground">de <MoneyText value={o.amount} /></span>
              <MoneyText value={o.open} tone={o.open > 0 ? "warning" : undefined} />
              {o.open > 0 && <Button size="sm" variant="outline" onClick={() => onPay(o)}>Pagar</Button>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
