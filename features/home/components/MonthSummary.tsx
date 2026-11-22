"use client";

import Link from "next/link";
import { MoneyText } from "@/components/patterns/values";
import { useDashboardKpis } from "@/hooks/useDashboard";
import { formatPercent } from "@/lib/format";

/** "Este mês: Faturamento · Lucro · Conversão" com atalho para Indicadores. */
export function MonthSummary({ today }: { today: string }) {
  const { kpis } = useDashboardKpis(`${today.slice(0, 8)}01`, today, !!today);
  if (!kpis) return null;
  return (
    <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-lg bg-muted/40 px-4 py-3 text-sm">
      <span className="font-medium">Este mês</span>
      <span>
        Faturamento <MoneyText value={kpis.sales.revenue} />
      </span>
      <span>
        Lucro <MoneyText value={kpis.sales.profit} />
      </span>
      {kpis.quotes.conversion_rate !== null && <span>Conversão {formatPercent(kpis.quotes.conversion_rate * 100)}</span>}
      <Link href="/indicadores" className="ml-auto underline-offset-4 hover:underline">
        Indicadores ›
      </Link>
    </p>
  );
}
