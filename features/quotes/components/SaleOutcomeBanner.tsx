"use client";

import { MoneyText } from "@/components/patterns/values";
import { useVenda } from "@/hooks/useVenda";
import { formatPercent } from "@/lib/format";

/** Margem estimada do orçamento × lucro previsto da venda lado a lado (T04): o dono vê o quanto o orçamento acerta. */
export function SaleOutcomeBanner({ saleId, estimatedMargin }: { saleId: string; estimatedMargin: number | null }) {
  const { venda } = useVenda(saleId);
  if (!venda) return null;
  const real = venda.total_venda > 0 ? (venda.lucro / venda.total_venda) * 100 : null;
  return (
    <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-lg bg-muted/40 px-3 py-2 text-sm">
      <span>Orçamento previa {formatPercent(estimatedMargin)}</span>
      <span>
        A venda prevê <MoneyText value={venda.lucro} /> ({formatPercent(real)})
      </span>
    </p>
  );
}
