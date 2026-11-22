"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EntityFormDialog } from "@/components/entity/EntityFormDialog";
import { EntityLink } from "@/components/entity/EntityLink";
import { ObligationsTable } from "@/components/entity/related-lists";
import { ActionsMenu } from "@/components/patterns/ActionsMenu";
import { DataTable } from "@/components/patterns/DataTable";
import { PageHeader } from "@/components/patterns/detail";
import { PageSkeleton } from "@/components/patterns/skeletons";
import { ErrorState } from "@/components/patterns/states";
import { StatusBadge } from "@/components/patterns/StatusBadge";
import { useUrlTab } from "@/components/patterns/useUrlTab";
import { DateText, MoneyText, QuantityText } from "@/components/patterns/values";
import { useSettleFlow } from "@/components/entity/settle-flow";
import { useFornecedor } from "@/hooks/useFornecedores";
import { useGeneratePurchase, queueItemIds } from "@/features/purchasing/mutations";
import { purchaseTitle } from "@/features/purchasing/model";
import { usePendingPurchaseQueue, usePurchases } from "@/features/purchasing/queries";
import { SUPPLIER_KIND_LABELS, formatMoney, todayISO } from "@/lib/format";
import { SUPPLIER_TABS, openPayables, supplierStats, type SupplierTab } from "../model";
import { useSupplierPayables } from "../queries";
import { SupplierForm } from "./SupplierForm";

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold">{children}</dd>
    </div>
  );
}

export function SupplierPage({ id }: { id: string }) {
  const router = useRouter();
  const settle = useSettleFlow();
  const { fornecedor, isLoading, error } = useFornecedor(id);
  const { purchases, isLoading: purchasesLoading } = usePurchases({ supplier_id: id });
  const payables = useSupplierPayables(id);
  const { groups, isLoading: queueLoading } = usePendingPurchaseQueue();
  const generate = useGeneratePurchase();
  const [tab, setTab] = useUrlTab(SUPPLIER_TABS, "compras");
  const [editing, setEditing] = useState(false);

  if (error) return <ErrorState message="Fornecedor não encontrado." />;
  if (isLoading || !fornecedor) return <PageSkeleton className="max-w-5xl" />;

  const queue = groups.find((g) => g.supplier_id === id);
  const stats = supplierStats(purchases, payables.items, queue, todayISO());
  const toPay = openPayables(payables.items);

  async function generateFromQueue() {
    const created = await generate.mutate(id, queueItemIds(groups, id));
    if (created?.id) router.push(`/compras/${created.id}`);
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <PageHeader
        title={fornecedor.nome}
        subtitle={[SUPPLIER_KIND_LABELS[fornecedor.kind], fornecedor.cidade, fornecedor.telefone].filter(Boolean).join(" · ")}
        backFallback="/fornecedores"
        backLabel="Fornecedores"
        menu={<ActionsMenu items={[{ id: "edit", label: "Editar cadastro", onSelect: () => setEditing(true) }]} />}
      />
      {(toPay.length > 0 || stats.queueItems > 0) && (
        <div className="flex flex-wrap gap-2">
          {toPay.length > 0 && <Button type="button" onClick={() => settle.open({ obligations: toPay })}>Pagar contas em aberto</Button>}
          {stats.queueItems > 0 && <Button type="button" variant="outline" onClick={() => void generateFromQueue()} disabled={generate.pending}>Gerar compra da fila</Button>}
        </div>
      )}
      {fornecedor.observacoes && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{fornecedor.observacoes}</p>}

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={stats.overdueCount > 0 ? `A pagar · ${stats.overdueCount} vencida(s)` : "A pagar"}>
          <MoneyText value={stats.payable} tone={stats.overdueCount > 0 ? "danger" : stats.payable > 0 ? "warning" : undefined} />
        </Stat>
        <Stat label={`Comprado em ${stats.windowDays} dias`}><MoneyText value={stats.bought} /></Stat>
        <Stat label="Compras">{purchases.length}</Stat>
        <Stat label="Na fila a comprar">{stats.queueItems}</Stat>
      </dl>

      <Tabs value={tab} onValueChange={(v) => setTab(v as SupplierTab)}>
        <TabsList>
          <TabsTrigger value="compras">Compras ({purchases.length})</TabsTrigger>
          <TabsTrigger value="contas">Contas a pagar{toPay.length > 0 ? ` (${toPay.length})` : ""}</TabsTrigger>
          <TabsTrigger value="a-comprar">A comprar{stats.queueItems > 0 ? ` · ${stats.queueItems}` : ""}</TabsTrigger>
        </TabsList>
        <TabsContent value="compras" className="mt-4">
          <DataTable
            caption="Compras do fornecedor"
            rows={purchases}
            isLoading={purchasesLoading}
            rowKey={(p) => p.id}
            rowHref={(p) => `/compras/${p.id}`}
            empty={{ title: "Nenhuma compra deste fornecedor." }}
            columns={[
              { id: "n", header: "Nº", phone: "title", cell: (p) => purchaseTitle(p) },
              { id: "status", header: "Status", phone: "badge", cell: (p) => <StatusBadge kind="purchase" value={p.status} /> },
              { id: "expected", header: "Previsão", phone: "meta", cell: (p) => <DateText value={p.expected_date?.slice(0, 10)} /> },
              { id: "cost", header: "Custo", phone: "value", align: "right", cell: (p) => <MoneyText value={p.total_cost} /> },
              { id: "payable", header: "A pagar", phone: "meta", align: "right", cell: (p) => <MoneyText value={p.payable} tone={p.payable > 0 ? "warning" : undefined} /> },
            ]}
          />
        </TabsContent>
        <TabsContent value="contas" className="mt-4">
          <ObligationsTable rows={payables.items} isLoading={payables.isLoading} empty="Nada a pagar a este fornecedor." />
        </TabsContent>
        <TabsContent value="a-comprar" className="mt-4">
          <DataTable
            caption="Items a comprar deste fornecedor"
            rows={queue?.items ?? []}
            isLoading={queueLoading}
            rowKey={(i) => i.id}
            empty={{ title: "Nada a comprar deste fornecedor." }}
            columns={[
              { id: "product", header: "Produto", phone: "title", cell: (i) => i.produto_nome },
              { id: "customer", header: "Cliente", phone: "subtitle", cell: (i) => i.customer_name },
              { id: "sale", header: "Venda", phone: "meta", cell: (i) => <EntityLink type="sale" id={i.sale_id} mode="peek">Venda de {i.sale_date ? <DateText value={i.sale_date.slice(0, 10)} /> : "—"}</EntityLink> },
              { id: "qty", header: "Qtd", phone: "meta", align: "right", cell: (i) => <QuantityText value={i.quantidade} /> },
              { id: "cost", header: "Custo", phone: "value", align: "right", cell: (i) => <MoneyText value={Math.round(i.quantidade * i.custo_unit * 100) / 100} /> },
            ]}
            summary={queue ? <span>{formatMoney(queue.items.reduce((s, i) => s + i.quantidade * i.custo_unit, 0))} a comprar</span> : undefined}
          />
        </TabsContent>
      </Tabs>

      {editing && <EntityFormDialog open onClose={() => setEditing(false)} titles={{ create: "Novo fornecedor", edit: "Editar fornecedor" }} Form={SupplierForm} entity={fornecedor} />}
    </div>
  );
}
