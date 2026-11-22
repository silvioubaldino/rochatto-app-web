"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, PackagePlus, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityLink } from "@/components/entity/EntityLink";
import { DataTable, type DataTableColumn } from "@/components/patterns/DataTable";
import { SelectBox } from "@/components/patterns/SelectBox";
import { Select } from "@/components/patterns/Select";
import { QuantityText, MoneyText, DateText } from "@/components/patterns/values";
import { ListSkeleton } from "@/components/patterns/skeletons";
import { EmptyState, ErrorState } from "@/components/patterns/states";
import { docNumber, formatMoney, formatQuantity } from "@/lib/format";
import type { PendingSaleItem, PendingSaleItemGroup, PurchaseListItem } from "@/lib/types";
import { queueCost, queueItemCost, selectedQueueItems, sortQueueGroups, toggleId } from "../model";
import { useAttachToPurchase, useGeneratePurchase } from "../mutations";
import { usePendingPurchaseQueue, usePurchases } from "../queries";

function itemColumns(selection?: { excluded: ReadonlySet<string>; onToggle: (id: string) => void }): DataTableColumn<PendingSaleItem>[] {
  return [
    ...(selection
      ? [{
          id: "select",
          header: "Incluir",
          phone: "meta" as const,
          width: "3.5rem",
          cell: (i: PendingSaleItem) => (
            <SelectBox checked={!selection.excluded.has(i.id)} onChange={() => selection.onToggle(i.id)} label={`Incluir ${i.produto_nome} de ${i.customer_name}`} />
          ),
        }]
      : []),
    { id: "product", header: "Produto", phone: "title", cell: (i) => i.produto_nome },
    { id: "customer", header: "Cliente", phone: "subtitle", cell: (i) => i.customer_name },
    {
      id: "sale",
      header: "Venda",
      phone: "meta",
      cell: (i) => (
        <EntityLink type="sale" id={i.sale_id} mode="peek">
          {i.sale_date ? <>Venda de <DateText value={i.sale_date.slice(0, 10)} className="no-underline" /></> : "Venda"}
        </EntityLink>
      ),
    },
    { id: "qty", header: "Qtd", phone: "meta", align: "right", cell: (i) => <QuantityText value={i.quantidade} /> },
    { id: "unit", header: "Custo unit.", phone: "hidden", align: "right", cell: (i) => <MoneyText value={i.custo_unit} /> },
    { id: "total", header: "Custo total", phone: "value", align: "right", cell: (i) => <MoneyText value={queueItemCost(i)} /> },
  ];
}

/**
 * Fila "a comprar" (RF-31, T11): Items sob encomenda sem compra, por fornecedor. Tudo vem marcado;
 * "Gerar compra" age sobre o que está marcado. O grupo sem fornecedor leva ao atendimento da venda.
 */
export function PurchaseQueue() {
  const { groups, isLoading, error, refresh } = usePendingPurchaseQueue();
  const { purchases: open } = usePurchases({ kind: "MADE_TO_ORDER", status: "OPEN" });
  if (isLoading) return <ListSkeleton />;
  if (error) return <ErrorState message="Erro ao carregar a fila de compras." onRetry={() => void refresh()} />;
  const sorted = sortQueueGroups(groups);
  if (sorted.length === 0) {
    return (
      <div className="rounded-lg border">
        <EmptyState title="Nada a comprar" description="Todos os Items sob encomenda já estão em compras." />
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {sorted.map((g) =>
        g.supplier_id ? (
          <SupplierGroup key={g.supplier_id} group={g} supplierId={g.supplier_id} openPurchases={open.filter((p) => p.supplier_id === g.supplier_id)} />
        ) : (
          <NoSupplierGroup key="none" group={g} />
        ),
      )}
    </div>
  );
}

function SupplierGroup({ group, supplierId, openPurchases }: { group: PendingSaleItemGroup; supplierId: string; openPurchases: PurchaseListItem[] }) {
  const router = useRouter();
  const generate = useGeneratePurchase();
  const attach = useAttachToPurchase();
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [targetId, setTargetId] = useState("");
  const chosen = selectedQueueItems(group, excluded);
  const ids = chosen.map((i) => i.id);
  const target = openPurchases.find((p) => p.id === targetId) ?? openPurchases[0];
  const busy = generate.pending || attach.pending;

  async function create() {
    const created = await generate.mutate(supplierId, ids);
    if (created?.id) router.push(`/compras/${created.id}`);
  }
  async function add() {
    if (target && (await attach.mutate(target.id, ids)) !== undefined) setExcluded(new Set());
  }

  return (
    <section aria-label={`A comprar de ${group.supplier_name ?? "fornecedor"}`} className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">
          <EntityLink type="supplier" id={supplierId}>{group.supplier_name ?? "Fornecedor"}</EntityLink>{" "}
          <span className="text-sm font-normal text-muted-foreground">· {group.items.length} {group.items.length === 1 ? "item" : "itens"} · {formatMoney(queueCost(group.items))}</span>
        </h2>
      </div>
      <DataTable
        caption={`Items a comprar de ${group.supplier_name ?? "fornecedor"}`}
        rows={group.items}
        rowKey={(i) => i.id}
        columns={itemColumns({ excluded, onToggle: (id) => setExcluded((s) => toggleId(s, id)) })}
        summary={<span>{chosen.length} de {group.items.length} marcados · {formatMoney(queueCost(chosen))}</span>}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={create} disabled={ids.length === 0 || busy}>
          <ShoppingBag aria-hidden />
          Gerar compra{ids.length > 0 ? ` · ${formatQuantity(ids.length)} ${ids.length === 1 ? "item" : "itens"}` : ""}
        </Button>
        {target && (
          <>
            {openPurchases.length > 1 && (
              <div className="min-w-48">
                <Select
                  aria-label="Compra aberta"
                  value={target.id}
                  onChange={setTargetId}
                  options={openPurchases.map((p) => ({ value: p.id, label: `${docNumber("Compra", p.number, p.id)} · ${formatMoney(p.total_cost)}` }))}
                />
              </div>
            )}
            <Button type="button" variant="outline" onClick={add} disabled={ids.length === 0 || busy}>
              <PackagePlus aria-hidden />
              Adicionar à {docNumber("Compra", target.number, target.id)}
            </Button>
          </>
        )}
      </div>
    </section>
  );
}

/** Sem fornecedor: o atendimento em lote da venda define fornecedor e origem (T11). */
function NoSupplierGroup({ group }: { group: PendingSaleItemGroup }) {
  const sales = new Set(group.items.map((i) => i.sale_id)).size;
  return (
    <section aria-label="Sem fornecedor definido" className="space-y-3 rounded-lg border border-warning/40 bg-card p-4">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
        <div>
          <h2 className="font-semibold">Sem fornecedor definido</h2>
          <p className="text-sm text-muted-foreground">
            {group.items.length} {group.items.length === 1 ? "item" : "itens"} de {sales} {sales === 1 ? "venda" : "vendas"}. Abra uma linha para definir o fornecedor no atendimento da venda.
          </p>
        </div>
      </div>
      <DataTable
        caption="Items sem fornecedor"
        rows={group.items}
        rowKey={(i) => i.id}
        rowHref={(i) => `/vendas/${i.sale_id}?atendimento=1`}
        columns={itemColumns()}
      />
    </section>
  );
}
