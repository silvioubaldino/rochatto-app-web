"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EntityCombobox } from "@/components/entity/EntityCombobox";
import { EntityLink } from "@/components/entity/EntityLink";
import { peekQuery } from "@/components/entity/entity-model";
import { DataTable, type DataTableColumn } from "@/components/patterns/DataTable";
import { FieldShell } from "@/components/patterns/fields";
import { FilterBar } from "@/components/patterns/FilterBar";
import { useUrlFilters } from "@/components/patterns/useUrlFilters";
import { useUrlTab } from "@/components/patterns/useUrlTab";
import { DateText, MoneyText, QuantityText } from "@/components/patterns/values";
import { STOCK_ADJUSTMENT_REASON_LABELS, formatMoney } from "@/lib/format";
import type { StockAdjustment, StockBalance } from "@/lib/types";
import { STOCK_CHIPS, STOCK_TABS, isNegative, type StockTab } from "../model";
import { useStockAdjustments, useStockBalance } from "../queries";
import { AdjustmentDialog } from "./AdjustmentDialog";

const SPEC = { q: {}, saldo: {}, produto: {} } as const;

function StockContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [tab, setTab] = useUrlTab(STOCK_TABS, "saldo");
  const f = useUrlFilters(SPEC);
  const v = f.values;
  const { balances, totalStockValue, isLoading, error, refresh } = useStockBalance({ q: v.q || undefined, only_negative: v.saldo === "negativo" || undefined });
  const adjustments = useStockAdjustments(v.produto || undefined);
  const preset = params.get("ajuste");
  const [adjusting, setAdjusting] = useState<{ productId?: string } | null>(() => (preset ? { productId: preset } : null));

  function closeAdjusting() {
    setAdjusting(null);
    if (preset) router.replace("/estoque", { scroll: false });
  }

  const balanceColumns: DataTableColumn<StockBalance>[] = [
    {
      id: "product",
      header: "Produto",
      phone: "title",
      sortValue: (b) => b.product_name,
      cell: (b) => b.product_name,
    },
    { id: "balance", header: "Saldo", phone: "value", align: "right", sortValue: (b) => b.balance, cell: (b) => <QuantityText value={b.balance} unit={b.unit} className={isNegative(b) ? "font-semibold text-danger" : "font-semibold"} /> },
    { id: "in", header: "Entradas", phone: "hidden", align: "right", cell: (b) => <QuantityText value={b.inflow_qty} /> },
    { id: "out", header: "Saídas", phone: "hidden", align: "right", cell: (b) => <QuantityText value={b.outflow_qty} /> },
    { id: "adj", header: "Ajustes", phone: "hidden", align: "right", cell: (b) => <QuantityText value={b.adjustment_qty} /> },
    { id: "cost", header: "Custo última entrada", phone: "meta", align: "right", cell: (b) => (b.last_inflow_cost !== null ? <MoneyText value={b.last_inflow_cost} /> : "—") },
    { id: "date", header: "Última entrada", phone: "hidden", cell: (b) => <DateText value={b.last_inflow_date?.slice(0, 10)} /> },
    { id: "value", header: "Valor em estoque", phone: "meta", align: "right", sortValue: (b) => b.stock_value ?? 0, cell: (b) => (b.stock_value != null ? <MoneyText value={b.stock_value} /> : "—") },
    { id: "status", header: "Situação", phone: "badge", cell: (b) => (isNegative(b) ? <span className="text-xs font-medium text-danger">Saldo negativo</span> : null) },
  ];

  const adjustmentColumns: DataTableColumn<StockAdjustment>[] = [
    { id: "date", header: "Data", phone: "title", sortValue: (a) => a.adjusted_at, cell: (a) => <DateText value={a.adjusted_at.slice(0, 10)} /> },
    { id: "product", header: "Produto", phone: "subtitle", cell: (a) => <EntityLink type="product" id={a.product_id} mode="peek">{a.product_name ?? "Produto"}</EntityLink> },
    { id: "reason", header: "Motivo", phone: "meta", cell: (a) => STOCK_ADJUSTMENT_REASON_LABELS[a.reason] ?? "—" },
    { id: "qty", header: "Quantidade", phone: "value", align: "right", cell: (a) => <QuantityText value={a.quantity} className={a.quantity < 0 ? "text-danger" : undefined} /> },
    { id: "cost", header: "Custo unit.", phone: "hidden", align: "right", cell: (a) => (a.unit_cost !== null ? <MoneyText value={a.unit_cost} /> : "—") },
    { id: "notes", header: "Observações", phone: "meta", cell: (a) => <span className="text-muted-foreground">{a.notes || "—"}</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Estoque</h1>
        <Button type="button" onClick={() => setAdjusting({})}>
          <Plus aria-hidden />
          Novo ajuste
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">Saldo = entradas (compras para estoque recebidas) − saídas (Items de venda de estoque) ± ajustes. Items sob encomenda não passam pelo estoque.</p>

      <Tabs value={tab} onValueChange={(t) => setTab(t as StockTab)}>
        <TabsList>
          <TabsTrigger value="saldo">Saldo por produto</TabsTrigger>
          <TabsTrigger value="ajustes">Ajustes</TabsTrigger>
        </TabsList>

        <TabsContent value="saldo" className="mt-4 space-y-4">
          <FilterBar
            chips={[{ label: "Saldo", options: STOCK_CHIPS, value: v.saldo, onChange: (saldo) => f.set({ saldo }) }]}
            search={{ value: v.q, onChange: (q) => f.set({ q }), placeholder: "Buscar produto" }}
            activeCount={(v.q ? 1 : 0) + (v.saldo ? 1 : 0)}
            onClear={() => f.set({ q: "", saldo: "" })}
          />
          <DataTable
            caption="Saldo por produto"
            columns={balanceColumns}
            rows={balances}
            rowKey={(b) => b.product_id}
            rowHref={(b) => `?${peekQuery(params, { type: "product", id: b.product_id })}`}
            isLoading={isLoading}
            error={error}
            onRetry={() => void refresh()}
            empty={{ title: v.q || v.saldo ? "Nenhum produto com esses filtros." : "Nenhum produto com movimento de estoque.", description: "Registre uma carga inicial com “Novo ajuste”.", action: { label: "Novo ajuste", onClick: () => setAdjusting({}) } }}
            summary={balances.length > 0 ? <span className="flex justify-between gap-4"><span>Total em estoque</span><span>{formatMoney(totalStockValue)}</span></span> : undefined}
          />
        </TabsContent>

        <TabsContent value="ajustes" className="mt-4 space-y-4">
          <FilterBar activeCount={v.produto ? 1 : 0} onClear={() => f.set({ produto: "" })}>
            <FieldShell label="Produto" htmlFor="sf-product"><EntityCombobox kind="product" id="sf-product" value={v.produto} allowCreate={false} placeholder="Todos" onChange={(id) => f.set({ produto: id })} /></FieldShell>
          </FilterBar>
          <DataTable caption="Ajustes de estoque" columns={adjustmentColumns} rows={adjustments.adjustments} rowKey={(a) => a.id} isLoading={adjustments.isLoading} error={adjustments.error} onRetry={() => void adjustments.refresh()} empty={{ title: "Nenhum ajuste registrado." }} defaultSort={{ id: "date", dir: "desc" }} />
        </TabsContent>
      </Tabs>

      {adjusting && <AdjustmentDialog productId={adjusting.productId} onClose={closeAdjusting} />}
    </div>
  );
}

export function StockPage() {
  return (
    <Suspense fallback={null}>
      <StockContent />
    </Suspense>
  );
}
