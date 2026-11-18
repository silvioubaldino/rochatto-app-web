"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Receipt,
  Percent,
} from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { VendasChart } from "@/components/dashboard/VendasChart";
import { ProdutosTable } from "@/components/dashboard/ProdutosTable";
import { AlertasPanel } from "@/components/dashboard/AlertasPanel";
import {
  useDashboardKpis,
  useNotificacoes,
  useVendasPorMes,
  useProdutosMaisVendidos,
} from "@/hooks/useDashboard";
import {
  financePresetPeriod,
  validateFinancePeriod,
  type FinancePeriod,
} from "@/lib/finance";
import { formatMoeda, formatPercentRate } from "@/lib/formatters";
import { Button } from "@/components/ui/button";

// Dashboard — AYD-005: KPIs do período (mesma base do Financeiro), saldos em aberto hoje
// com drill-down, gráfico mensal e ranking de Products.

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export default function DashboardPage() {
  const router = useRouter();
  const [period, setPeriod] = useState<FinancePeriod>(() =>
    financePresetPeriod("this_month"),
  );
  const [meses, setMeses] = useState(6);

  const periodError = validateFinancePeriod(period);
  const periodOk = !periodError;

  const { kpis, isLoading: kpisLoading, error: kpisError, refresh: refreshKpis } =
    useDashboardKpis(period.from, period.to, periodOk);
  const { notificacoes, isLoading: notifLoading } = useNotificacoes();
  const { vendasPorMes, isLoading: chartLoading } = useVendasPorMes(meses);
  const { produtos, isLoading: produtosLoading } = useProdutosMaisVendidos(
    period.from,
    period.to,
    periodOk,
  );

  const loading = periodOk && kpisLoading;
  const sales = kpis?.sales;
  const quotes = kpis?.quotes;
  const balances = kpis?.balances;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <PeriodSelector period={period} onChange={setPeriod} />
        {periodError && <p className="text-xs text-destructive">{periodError}</p>}
      </div>

      {kpisError && periodOk && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="text-destructive">
            {kpisError instanceof Error ? kpisError.message : "Erro ao carregar os indicadores."}
          </p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => refreshKpis()}>
            Tentar novamente
          </Button>
        </div>
      )}

      {/* KPIs do período */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground">No período</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KPICard
            title="Faturamento"
            value={sales ? formatMoeda(sales.revenue) : "—"}
            subtitle={sales ? plural(sales.count, "venda", "vendas") : undefined}
            icon={<DollarSign className="h-4 w-4" />}
            isLoading={loading}
          />
          <KPICard
            title="Lucro"
            value={sales ? formatMoeda(sales.profit) : "—"}
            variant="success"
            icon={<TrendingUp className="h-4 w-4" />}
            isLoading={loading}
          />
          <KPICard
            title="Ticket médio"
            value={sales ? formatMoeda(sales.average_ticket) : "—"}
            subtitle="Faturamento ÷ vendas"
            icon={<Receipt className="h-4 w-4" />}
            isLoading={loading}
          />
          <div title="Dos orçamentos emitidos no período, quantos viraram venda até hoje. Não conta vendas rápidas (não houve negociação).">
            <KPICard
              title="Conversão de orçamentos"
              value={quotes ? formatPercentRate(quotes.conversion_rate) : "—"}
              subtitle={
                quotes
                  ? `${quotes.won} de ${plural(quotes.created, "orçamento", "orçamentos")} · ${plural(quotes.open, "aberto", "abertos")}`
                  : undefined
              }
              icon={<Percent className="h-4 w-4" />}
              isLoading={loading}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Conversão = orçamentos emitidos no período que viraram venda; vendas rápidas não entram.
        </p>
      </section>

      {/* Saldos em aberto (hoje) */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground">
          Hoje · em aberto
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KPICard
            title="A Receber"
            value={balances ? formatMoeda(balances.receivable) : "—"}
            subtitle="Vendas com saldo a receber"
            variant="warning"
            icon={<DollarSign className="h-4 w-4" />}
            isLoading={loading}
            onClick={() => router.push("/vendas?payment_status=PENDING,PARTIAL")}
          />
          <KPICard
            title="A Pagar Fornecedores"
            value={balances ? formatMoeda(balances.payable_to_suppliers) : "—"}
            subtitle="Compras com pagamento pendente"
            variant="danger"
            icon={<TrendingDown className="h-4 w-4" />}
            isLoading={loading}
            onClick={() => router.push("/compras?payment_status=PENDING")}
          />
          <KPICard
            title="Comissões Pendentes"
            value={balances ? formatMoeda(balances.commission_payable) : "—"}
            subtitle="A pagar parceiros"
            variant="warning"
            icon={<Users className="h-4 w-4" />}
            isLoading={loading}
            onClick={() => router.push("/vendas?commission_pending=true")}
          />
          <KPICard
            title="Vendas a Entregar"
            value={kpis ? String(kpis.open_deliveries) : "—"}
            subtitle={
              balances ? `Frete a pagar: ${formatMoeda(balances.freight_payable)}` : undefined
            }
            icon={<ShoppingCart className="h-4 w-4" />}
            isLoading={loading}
            onClick={() => router.push("/vendas?delivery_status=TO_DELIVER")}
          />
        </div>
      </section>

      {/* Middle row: Alertas + Gráfico */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alertas */}
        <div className="lg:col-span-1 rounded-lg border p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm">
              Alertas
              {Array.isArray(notificacoes) && notificacoes.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-xs px-1.5 py-0.5 leading-none">
                  {notificacoes.length}
                </span>
              )}
            </h2>
          </div>
          <AlertasPanel notificacoes={notificacoes} isLoading={notifLoading} />
        </div>

        {/* Gráfico */}
        <div className="lg:col-span-2 rounded-lg border p-4 min-w-0">
          <VendasChart
            dados={vendasPorMes}
            isLoading={chartLoading}
            meses={meses}
            onChangeMeses={setMeses}
          />
        </div>
      </div>

      {/* Produtos mais vendidos */}
      <div className="rounded-lg border p-4 min-w-0">
        <h2 className="font-semibold text-sm mb-3">Produtos Mais Vendidos</h2>
        <ProdutosTable produtos={produtos} isLoading={produtosLoading} />
      </div>
    </div>
  );
}
