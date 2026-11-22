"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/patterns/StatusBadge";
import { MoneyText } from "@/components/patterns/values";
import { formatCounterparty } from "@/lib/format";
import type { Obligation } from "@/lib/types";

/** Contas a pagar desta venda (T06 §4): lista compacta por credor, com Pagar. */
export function SalePayablesCard({
  payables,
  readOnly,
  onPay,
}: {
  payables: readonly Obligation[];
  readOnly: boolean;
  onPay: (o: Obligation) => void;
}) {
  if (payables.length === 0) return null;
  return (
    <section aria-labelledby="sale-payables" className="space-y-2 rounded-lg border bg-card p-4">
      <h2 id="sale-payables" className="text-sm font-semibold">Contas a pagar desta venda</h2>
      <ul className="divide-y">
        {payables.map((o) => (
          <li key={o.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2 text-sm">
            <Link href={`/contas/${o.id}`} className="min-w-0 flex-1 basis-40 font-medium hover:underline">
              {formatCounterparty(o.counterparty)}
            </Link>
            <StatusBadge kind="obligation" value={o.status} />
            <MoneyText value={o.open} tone={o.open > 0 ? "warning" : undefined} />
            {!readOnly && o.open > 0 && <Button size="sm" variant="outline" onClick={() => onPay(o)}>Pagar</Button>}
          </li>
        ))}
      </ul>
    </section>
  );
}
