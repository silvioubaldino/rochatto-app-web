"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { formatMoeda, formatQuantidade } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { ProdutoMaisVendido } from "@/lib/types";

interface ProdutosTableProps {
  produtos: ProdutoMaisVendido[];
  isLoading?: boolean;
}

function margemColor(margem: number | null | undefined): string {
  if (!margem && margem !== 0) return "text-muted-foreground";
  if (margem > 30) return "text-green-600 font-semibold";
  if (margem >= 15) return "text-yellow-600 font-semibold";
  return "text-red-600 font-semibold";
}

export function ProdutosTable({ produtos, isLoading }: ProdutosTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  const safeProdutos = Array.isArray(produtos) ? produtos : [];

  if (safeProdutos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Nenhuma venda registrada no período.
      </p>
    );
  }

  const top10 = safeProdutos.slice(0, 10);

  return (
    <div className="overflow-x-auto max-w-full">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="py-2 text-left font-medium">Produto</th>
            <th className="py-2 text-right font-medium">Vendas</th>
            <th className="py-2 text-right font-medium">Qtd Total</th>
            <th className="py-2 text-right font-medium">Receita Total</th>
            <th className="py-2 text-right font-medium">Preço Médio</th>
            <th className="py-2 text-right font-medium">Custo Médio</th>
            <th className="py-2 text-right font-medium">Margem %</th>
          </tr>
        </thead>
        <tbody>
          {top10.map((p) => (
            <tr key={p.produto_id ?? p.produto_nome} className="border-b last:border-0 hover:bg-muted/50">
              <td className="py-2 pr-4">{p.produto_nome}</td>
              <td className="py-2 text-right">{p.total_vendas}</td>
              <td className="py-2 text-right whitespace-nowrap">
                {formatQuantidade(p.total_quantidade)}
                {p.unit ? ` ${p.unit}` : ""}
              </td>
              <td className="py-2 text-right">{formatMoeda(p.total_receita)}</td>
              <td className="py-2 text-right">{formatMoeda(p.preco_medio)}</td>
              <td className="py-2 text-right">{formatMoeda(p.custo_medio)}</td>
              <td className={cn("py-2 text-right", margemColor(p.margem_media_percent))}>
                {(p.margem_media_percent ?? 0).toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
