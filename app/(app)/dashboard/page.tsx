"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
} from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";
import {
  PeriodoSelector,
  getDefaultPeriodo,
} from "@/components/dashboard/PeriodoSelector";
import { VendasChart } from "@/components/dashboard/VendasChart";
import { ProdutosTable } from "@/components/dashboard/ProdutosTable";
import { AlertasPanel } from "@/components/dashboard/AlertasPanel";
import {
  useDashboardResumo,
  useNotificacoes,
  useVendasPorMes,
  useProdutosMaisVendidos,
} from "@/hooks/useDashboard";
import { formatMoeda } from "@/lib/formatters";

export default function DashboardPage() {
  const router = useRouter();
  const defaultPeriodo = getDefaultPeriodo();
  const [dataInicio, setDataInicio] = useState(defaultPeriodo.inicio);
  const [dataFim, setDataFim] = useState(defaultPeriodo.fim);
  const [meses, setMeses] = useState(6);

  const { resumo, isLoading: resumoLoading, refresh: refreshResumo } =
    useDashboardResumo(dataInicio, dataFim);
  const {
    notificacoes,
    isLoading: notifLoading,
    refresh: refreshNotif,
  } = useNotificacoes();
  const { vendasPorMes, isLoading: chartLoading } = useVendasPorMes(meses);
  const { produtos, isLoading: produtosLoading } = useProdutosMaisVendidos(
    dataInicio,
    dataFim,
  );

  function handlePeriodoChange(inicio: string, fim: string) {
    setDataInicio(inicio);
    setDataFim(fim);
  }

  function handleAlertRefresh() {
    refreshNotif();
    refreshResumo();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <PeriodoSelector
          dataInicio={dataInicio}
          dataFim={dataFim}
          onChange={handlePeriodoChange}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <KPICard
          title="A Receber"
          value={resumo ? formatMoeda(resumo.total_a_receber) : "—"}
          subtitle={
            resumo
              ? `${resumo.vendas_abertas} venda${resumo.vendas_abertas !== 1 ? "s" : ""} em aberto`
              : undefined
          }
          variant="warning"
          icon={<DollarSign className="h-4 w-4" />}
          isLoading={resumoLoading}
          onClick={() => router.push("/vendas?pendente=true")}
        />
        <KPICard
          title="A Pagar Fornecedores"
          value={resumo ? formatMoeda(resumo.total_a_pagar_fornecedor) : "—"}
          variant="danger"
          icon={<TrendingDown className="h-4 w-4" />}
          isLoading={resumoLoading}
          onClick={() => router.push("/vendas")}
        />
        <KPICard
          title="Lucro do Período"
          value={resumo ? formatMoeda(resumo.lucro_periodo) : "—"}
          subtitle={
            resumo
              ? `${formatMoeda(resumo.total_vendido_periodo)} vendido`
              : undefined
          }
          variant="success"
          icon={<TrendingUp className="h-4 w-4" />}
          isLoading={resumoLoading}
        />
        <KPICard
          title="Vendas Abertas"
          value={resumo ? String(resumo.vendas_abertas) : "—"}
          subtitle="Não entregues"
          variant="default"
          icon={<ShoppingCart className="h-4 w-4" />}
          isLoading={resumoLoading}
          onClick={() => router.push("/vendas?status=A_ENTREGAR")}
        />
        <KPICard
          title="Comissões Pendentes"
          value={resumo ? formatMoeda(resumo.total_comissoes_pendentes) : "—"}
          subtitle="A pagar parceiros"
          variant="warning"
          icon={<Users className="h-4 w-4" />}
          isLoading={resumoLoading}
          onClick={() => router.push("/vendas")}
        />
      </div>

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
          <AlertasPanel
            notificacoes={notificacoes}
            isLoading={notifLoading}
            onRefresh={handleAlertRefresh}
          />
        </div>

        {/* Gráfico */}
        <div className="lg:col-span-2 rounded-lg border p-4">
          <VendasChart
            dados={vendasPorMes}
            isLoading={chartLoading}
            meses={meses}
            onChangeMeses={setMeses}
          />
        </div>
      </div>

      {/* Produtos mais vendidos */}
      <div className="rounded-lg border p-4">
        <h2 className="font-semibold text-sm mb-3">Produtos Mais Vendidos</h2>
        <ProdutosTable produtos={produtos} isLoading={produtosLoading} />
      </div>
    </div>
  );
}
