"use client";

import { useSearchParams } from "next/navigation";
import { peekQuery } from "@/components/entity/entity-model";
import { DataTable, type DataTableColumn } from "@/components/patterns/DataTable";
import { StatusBadge } from "@/components/patterns/StatusBadge";
import { MoneyText, QuantityText } from "@/components/patterns/values";
import { formatPercent } from "@/lib/format";
import type { ProdutoMaisVendido, ServicoMaisVendido } from "@/lib/types";
import { RANKING_SIZE, marginTone } from "../model";

const Margin = ({ value }: { value: number | null | undefined }) => <StatusBadge tone={marginTone(value)}>{formatPercent(value ?? 0)}</StatusBadge>;

export function ProductsRanking({ rows, isLoading }: { rows: readonly ProdutoMaisVendido[]; isLoading?: boolean }) {
  const params = useSearchParams();
  const columns: DataTableColumn<ProdutoMaisVendido>[] = [
    { id: "name", header: "Produto", phone: "title", cell: (p) => p.produto_nome },
    { id: "sales", header: "Vendas", phone: "meta", align: "right", sortValue: (p) => p.total_vendas, cell: (p) => p.total_vendas },
    { id: "qty", header: "Qtd total", phone: "meta", align: "right", sortValue: (p) => p.total_quantidade, cell: (p) => <QuantityText value={p.total_quantidade} unit={p.unit} /> },
    { id: "revenue", header: "Receita", phone: "value", align: "right", sortValue: (p) => p.total_receita, cell: (p) => <MoneyText value={p.total_receita} /> },
    { id: "price", header: "Preço médio", phone: "meta", align: "right", sortValue: (p) => p.preco_medio, cell: (p) => <MoneyText value={p.preco_medio} /> },
    { id: "cost", header: "Custo médio", phone: "hidden", align: "right", sortValue: (p) => p.custo_medio, cell: (p) => <MoneyText value={p.custo_medio} /> },
    { id: "margin", header: "Margem", phone: "badge", align: "right", sortValue: (p) => p.margem_media_percent, cell: (p) => <Margin value={p.margem_media_percent} /> },
  ];
  return (
    <DataTable
      caption="Produtos mais vendidos"
      columns={columns}
      rows={(Array.isArray(rows) ? rows : []).slice(0, RANKING_SIZE)}
      rowKey={(p) => p.produto_id ?? p.produto_nome}
      rowHref={(p) => (p.produto_id ? `?${peekQuery(params, { type: "product", id: p.produto_id })}` : undefined)}
      isLoading={isLoading}
      empty={{ title: "Nenhuma venda registrada no período." }}
    />
  );
}

export function ServicesRanking({ rows, isLoading }: { rows: readonly ServicoMaisVendido[]; isLoading?: boolean }) {
  const columns: DataTableColumn<ServicoMaisVendido>[] = [
    { id: "name", header: "Serviço", phone: "title", cell: (s) => s.service_name },
    { id: "sales", header: "Vendas", phone: "meta", align: "right", sortValue: (s) => s.total_vendas, cell: (s) => s.total_vendas },
    { id: "qty", header: "Qtd total", phone: "meta", align: "right", cell: (s) => <QuantityText value={s.total_quantidade} unit={s.unit} /> },
    { id: "revenue", header: "Receita", phone: "value", align: "right", sortValue: (s) => s.total_receita, cell: (s) => <MoneyText value={s.total_receita} /> },
    { id: "price", header: "Preço médio", phone: "meta", align: "right", cell: (s) => <MoneyText value={s.preco_medio} /> },
    { id: "cost", header: "Custo médio", phone: "hidden", align: "right", cell: (s) => <MoneyText value={s.custo_medio} /> },
    { id: "margin", header: "Margem", phone: "badge", align: "right", sortValue: (s) => s.margem_media_percent, cell: (s) => <Margin value={s.margem_media_percent} /> },
  ];
  return (
    <DataTable
      caption="Serviços vendidos"
      columns={columns}
      rows={(Array.isArray(rows) ? rows : []).slice(0, RANKING_SIZE)}
      rowKey={(s) => s.service_id ?? s.service_name}
      isLoading={isLoading}
      empty={{ title: "Nenhum serviço vendido no período." }}
    />
  );
}
