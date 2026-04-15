"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatMoeda } from "@/lib/formatters";
import type { VendasPorMes } from "@/lib/types";

interface VendasChartProps {
  dados: VendasPorMes[];
  isLoading?: boolean;
  meses: number;
  onChangeMeses: (m: number) => void;
}

function formatMes(isoDate: string): string {
  try {
    return format(parseISO(isoDate + "-01"), "MMM/yy", { locale: ptBR });
  } catch {
    return isoDate;
  }
}

function tickFormatter(value: number): string {
  if (value >= 1000) return `R$${(value / 1000).toFixed(0)}k`;
  return `R$${value}`;
}

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background p-3 shadow text-sm space-y-1">
      <p className="font-semibold">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {formatMoeda(entry.value)}
        </p>
      ))}
    </div>
  );
}

export function VendasChart({
  dados,
  isLoading,
  meses,
  onChangeMeses,
}: VendasChartProps) {
  const safeData = Array.isArray(dados) ? dados : [];
  const chartData = safeData.map((d) => ({
    ...d,
    mesLabel: formatMes(d.mes),
  }));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Vendas por Mês</h3>
        <div className="flex gap-1">
          {[6, 12].map((n) => (
            <Button
              key={n}
              size="sm"
              variant={meses === n ? "default" : "outline"}
              onClick={() => onChangeMeses(n)}
            >
              {n === 6 ? "6 meses" : "12 meses"}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-[280px] w-full" />
      ) : safeData.length === 0 ? (
        <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
          Nenhuma venda no período
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="mesLabel"
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={tickFormatter}
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar
              dataKey="total_venda"
              name="Vendas"
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="lucro"
              name="Lucro"
              fill="#22c55e"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
