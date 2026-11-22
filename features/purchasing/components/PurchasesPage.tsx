"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EntityCombobox } from "@/components/entity/EntityCombobox";
import { EntityLink } from "@/components/entity/EntityLink";
import { DataTable, type DataTableColumn } from "@/components/patterns/DataTable";
import { DateField, FieldShell } from "@/components/patterns/fields";
import { FilterBar } from "@/components/patterns/FilterBar";
import { Select } from "@/components/patterns/Select";
import { StatusBadge } from "@/components/patterns/StatusBadge";
import { useUrlFilters } from "@/components/patterns/useUrlFilters";
import { useUrlTab } from "@/components/patterns/useUrlTab";
import { DateText, MoneyText } from "@/components/patterns/values";
import { useProduto } from "@/hooks/useProdutos";
import { PURCHASE_KIND_LABELS, formatMoney, todayISO } from "@/lib/format";
import type { PurchaseListItem } from "@/lib/types";
import {
  PURCHASE_ACCOUNT_OPTIONS,
  PURCHASE_CHIPS,
  filtersFromUrl,
  isExpectedLate,
  purchaseTitle,
  purchaseTotals,
  queueCount,
} from "../model";
import { usePendingPurchaseQueue, usePurchases } from "../queries";
import { PurchaseQueue } from "./PurchaseQueue";
import { ReplenishmentDialog } from "./ReplenishmentDialog";

const TABS = ["compras", "a-comprar"] as const;
const SPEC = { status: {}, kind: {}, supplier_id: {}, from: {}, to: {}, contas: {} } as const;
const KIND_OPTIONS = [{ value: "", label: "Todos" }, ...(["MADE_TO_ORDER", "STOCK_REPLENISHMENT"] as const).map((k) => ({ value: k, label: PURCHASE_KIND_LABELS[k] }))];

function PurchasesContent() {
  const [tab, setTab] = useUrlTab(TABS, "compras");
  const f = useUrlFilters(SPEC);
  const v = f.values;
  const { purchases, isLoading, error, refresh } = usePurchases(filtersFromUrl(v));
  const { groups } = usePendingPurchaseQueue();
  const router = useRouter();
  // `?repor=<produto>` (da prévia do produto) abre a compra para estoque já com o produto.
  const reporId = useSearchParams().get("repor") ?? "";
  const reporProduct = useProduto(reporId).produto;
  const [replenish, setReplenish] = useState(false);
  const showReplenish = replenish || (!!reporId && !!reporProduct);
  function closeReplenish() {
    setReplenish(false);
    if (reporId) router.replace("/compras", { scroll: false });
  }
  const today = todayISO();
  const totals = purchaseTotals(purchases);
  const pending = queueCount(groups);

  const columns: DataTableColumn<PurchaseListItem>[] = [
    { id: "number", header: "Nº", phone: "title", sortValue: (p) => p.number ?? 0, cell: (p) => purchaseTitle(p) },
    {
      id: "supplier",
      header: "Fornecedor",
      phone: "subtitle",
      sortValue: (p) => p.supplier_name,
      cell: (p) => <EntityLink type="supplier" id={p.supplier_id}>{p.supplier_name}</EntityLink>,
    },
    { id: "kind", header: "Tipo", phone: "meta", cell: (p) => PURCHASE_KIND_LABELS[p.kind] },
    { id: "status", header: "Status", phone: "badge", cell: (p) => <StatusBadge kind="purchase" value={p.status} /> },
    {
      id: "expected",
      header: "Previsão",
      phone: "meta",
      sortValue: (p) => p.expected_date ?? "",
      cell: (p) => (
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <DateText value={p.expected_date?.slice(0, 10)} tone={isExpectedLate(p, today) ? "danger" : undefined} />
          {isExpectedLate(p, today) && <StatusBadge tone="danger">Atrasada</StatusBadge>}
        </span>
      ),
    },
    { id: "cost", header: "Custo", phone: "value", align: "right", sortValue: (p) => p.total_cost, cell: (p) => <MoneyText value={p.total_cost} /> },
    {
      id: "payable",
      header: "A pagar",
      phone: "meta",
      align: "right",
      sortValue: (p) => p.payable,
      cell: (p) => <MoneyText value={p.payable} tone={p.payable > 0 ? "warning" : undefined} />,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Compras</h1>
        <Button type="button" onClick={() => setReplenish(true)}>
          <Plus aria-hidden />
          Compra para estoque
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(t) => setTab(t as (typeof TABS)[number])}>
        <TabsList>
          <TabsTrigger value="compras">Compras</TabsTrigger>
          <TabsTrigger value="a-comprar">A comprar{pending > 0 ? ` · ${pending}` : ""}</TabsTrigger>
        </TabsList>

        <TabsContent value="compras" className="mt-4 space-y-4">
          <FilterBar
            chips={[{ label: "Situação da compra", options: PURCHASE_CHIPS, value: v.status, onChange: (status) => f.set({ status }) }]}
            activeCount={f.activeCount}
            onClear={f.clear}
          >
            <FieldShell label="Fornecedor" htmlFor="pf-supplier">
              <EntityCombobox kind="supplier" id="pf-supplier" value={v.supplier_id} allowCreate={false} placeholder="Todos" onChange={(id) => f.set({ supplier_id: id })} />
            </FieldShell>
            <FieldShell label="Tipo" htmlFor="pf-kind"><Select id="pf-kind" value={v.kind} onChange={(kind) => f.set({ kind })} options={KIND_OPTIONS} /></FieldShell>
            <FieldShell label="Contas" htmlFor="pf-contas"><Select id="pf-contas" value={v.contas} onChange={(contas) => f.set({ contas })} options={PURCHASE_ACCOUNT_OPTIONS} /></FieldShell>
            <FieldShell label="De" htmlFor="pf-from"><DateField id="pf-from" shortcuts={false} value={v.from} onChange={(from) => f.set({ from })} /></FieldShell>
            <FieldShell label="Até" htmlFor="pf-to"><DateField id="pf-to" shortcuts={false} value={v.to} onChange={(to) => f.set({ to })} /></FieldShell>
          </FilterBar>
          <DataTable
            caption="Compras"
            columns={columns}
            rows={purchases}
            rowKey={(p) => p.id}
            rowHref={(p) => `/compras/${p.id}`}
            isLoading={isLoading}
            error={error}
            onRetry={() => void refresh()}
            empty={{ title: "Nenhuma compra encontrada.", description: "As compras nascem da fila “a comprar” ou da reposição de estoque." }}
            summary={purchases.length > 0 ? <span className="flex flex-wrap justify-between gap-x-6">Custo {formatMoney(totals.cost)} · A pagar {formatMoney(totals.payable)}</span> : undefined}
          />
        </TabsContent>

        <TabsContent value="a-comprar" className="mt-4">
          <PurchaseQueue />
        </TabsContent>
      </Tabs>

      {showReplenish && <ReplenishmentDialog onClose={closeReplenish} product={reporProduct ? { id: reporProduct.id, unit_cost: reporProduct.custo_referencia ?? 0 } : undefined} />}
    </div>
  );
}

export function PurchasesPage() {
  return (
    <Suspense fallback={null}>
      <PurchasesContent />
    </Suspense>
  );
}
