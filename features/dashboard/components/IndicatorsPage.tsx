"use client";

import { Suspense, useState } from "react";
import { DollarSign, Percent, Receipt, ShoppingCart, TrendingDown, TrendingUp } from "lucide-react";
import { PeriodSelector } from "@/components/patterns/PeriodSelector";
import { ErrorState } from "@/components/patterns/states";
import { StatCard } from "@/components/patterns/StatCard";
import { useUrlPeriod } from "@/components/patterns/useUrlPeriod";
import { MoneyText } from "@/components/patterns/values";
import { useDashboardKpis, useProdutosMaisVendidos, useServicosMaisVendidos, useVendasPorMes } from "@/hooks/useDashboard";
import { formatPercentRate } from "@/lib/format";
import { KPI_LINKS, plural, salesLink } from "../model";
import { MonthlySalesChart } from "./MonthlySalesChart";
import { ProductsRanking, ServicesRanking } from "./RankingTables";

function Content() {
  const { period, setPeriod, error: periodError } = useUrlPeriod();
  const [months, setMonths] = useState(6);
  const ok = !periodError;
  const { kpis, isLoading, error, refresh } = useDashboardKpis(period.from, period.to, ok);
  const chart = useVendasPorMes(months);
  const products = useProdutosMaisVendidos(period.from, period.to, ok);
  const services = useServicosMaisVendidos(period.from, period.to, ok);
  const loading = ok && isLoading;
  const { sales, quotes, balances } = kpis ?? {};

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Indicadores</h1>
        <PeriodSelector period={period} onChange={setPeriod} />
        {periodError && <p role="alert" className="text-xs text-destructive">{periodError}</p>}
      </div>

      {error && ok && <ErrorState message="Erro ao carregar os indicadores." onRetry={() => void refresh()} />}

      <section aria-labelledby="kpi-period" className="space-y-3">
        <h2 id="kpi-period" className="text-sm font-semibold text-muted-foreground uppercase">No período</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Faturamento" value={sales ? <MoneyText value={sales.revenue} /> : "—"} subtitle={sales ? plural(sales.count, "venda", "vendas") : undefined} icon={<DollarSign className="size-4" />} isLoading={loading} href={salesLink(period)} />
          <StatCard title="Lucro" value={sales ? <MoneyText value={sales.profit} /> : "—"} tone="success" icon={<TrendingUp className="size-4" />} isLoading={loading} />
          <StatCard title="Ticket médio" value={sales ? <MoneyText value={sales.average_ticket} /> : "—"} subtitle="Faturamento ÷ vendas" icon={<Receipt className="size-4" />} isLoading={loading} />
          <StatCard
            title="Conversão de orçamentos"
            value={quotes ? formatPercentRate(quotes.conversion_rate) : "—"}
            subtitle={quotes ? `${quotes.won} de ${plural(quotes.created, "orçamento", "orçamentos")} · ${plural(quotes.open, "aberto", "abertos")}` : undefined}
            icon={<Percent className="size-4" />}
            isLoading={loading}
            href="/orcamentos"
          />
        </div>
        <p className="text-xs text-muted-foreground">Conversão = orçamentos emitidos no período que viraram venda; vendas rápidas não entram (não houve negociação).</p>
      </section>

      <section aria-labelledby="kpi-today" className="space-y-3">
        <h2 id="kpi-today" className="text-sm font-semibold text-muted-foreground uppercase">Hoje · em aberto</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard title="A receber" value={balances ? <MoneyText value={balances.receivable} /> : "—"} subtitle="Contas a receber em aberto" tone="warning" icon={<DollarSign className="size-4" />} isLoading={loading} href={KPI_LINKS.receivable} />
          <StatCard title="A pagar" value={balances ? <MoneyText value={balances.payable} /> : "—"} subtitle="Compras e custos de venda em aberto" tone="danger" icon={<TrendingDown className="size-4" />} isLoading={loading} href={KPI_LINKS.payable} />
          <StatCard title="Vendas a entregar" value={kpis ? String(kpis.open_deliveries) : "—"} icon={<ShoppingCart className="size-4" />} isLoading={loading} href={KPI_LINKS.toDeliver} />
        </div>
      </section>

      <section className="min-w-0 rounded-lg border p-4">
        <MonthlySalesChart dados={chart.vendasPorMes} isLoading={chart.isLoading} meses={months} onChangeMeses={setMonths} />
      </section>

      <section aria-labelledby="rank-products" className="min-w-0 space-y-3">
        <h2 id="rank-products" className="text-sm font-semibold">Produtos mais vendidos</h2>
        <ProductsRanking rows={products.produtos} isLoading={products.isLoading} />
      </section>

      <section aria-labelledby="rank-services" className="min-w-0 space-y-3">
        <h2 id="rank-services" className="text-sm font-semibold">Serviços</h2>
        <ServicesRanking rows={services.servicos} isLoading={services.isLoading} />
      </section>
    </div>
  );
}

/** Indicadores (T15, ex-Dashboard): KPIs do período com link para a lista, gráfico mensal e rankings. */
export function IndicatorsPage() {
  return (
    <Suspense fallback={null}>
      <Content />
    </Suspense>
  );
}
