"use client";

import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityLink } from "@/components/entity/EntityLink";
import { DataTable, type DataTableColumn } from "@/components/patterns/DataTable";
import { StatusBadge } from "@/components/patterns/StatusBadge";
import { MoneyText, QuantityText } from "@/components/patterns/values";
import { docNumber } from "@/lib/format";
import type { PurchaseDetail, PurchaseItem, PurchaseSaleItem, SaleDeliveryStatus } from "@/lib/types";

type SaleInfo = Readonly<Record<string, { number?: number; delivery_status: SaleDeliveryStatus }>>;

/** Items da compra (T12): de venda (cliente, venda e entrega) ou de reposição (produtos). */
export function PurchaseItemsSection({
  purchase,
  sales,
  onAddItem,
  onEditItem,
  onRemoveItem,
  onDetach,
  onDeliver,
}: {
  purchase: PurchaseDetail;
  sales: SaleInfo;
  onAddItem: () => void;
  onEditItem: (item: PurchaseItem) => void;
  onRemoveItem: (item: PurchaseItem) => void;
  onDetach: (item: PurchaseSaleItem) => void;
  onDeliver: (saleId: string) => void;
}) {
  const router = useRouter();
  const open = purchase.status === "OPEN";
  const received = purchase.status === "RECEIVED";

  const saleColumns: DataTableColumn<PurchaseSaleItem>[] = [
    { id: "product", header: "Produto", phone: "title", cell: (i) => i.produto_nome },
    { id: "customer", header: "Cliente", phone: "subtitle", cell: (i) => i.customer_name },
    {
      id: "sale",
      header: "Venda",
      phone: "meta",
      cell: (i) => <EntityLink type="sale" id={i.sale_id} mode="peek">{docNumber("Venda", sales[i.sale_id]?.number, i.sale_id)}</EntityLink>,
    },
    {
      id: "delivery",
      header: "Entrega",
      phone: "badge",
      cell: (i) => {
        const s = sales[i.sale_id];
        if (!s) return <span className="text-muted-foreground">—</span>;
        return (
          <span className="inline-flex flex-wrap items-center gap-2">
            <StatusBadge kind="saleDelivery" value={s.delivery_status} />
            {received && s.delivery_status === "TO_DELIVER" && (
              <Button type="button" size="sm" variant="outline" className="relative z-10" onClick={() => onDeliver(i.sale_id)}>Marcar entregue</Button>
            )}
          </span>
        );
      },
    },
    { id: "qty", header: "Qtd", phone: "meta", align: "right", cell: (i) => <QuantityText value={i.quantidade} /> },
    { id: "unit", header: "Custo unit.", phone: "hidden", align: "right", cell: (i) => <MoneyText value={i.custo_unit} /> },
    { id: "total", header: "Total", phone: "value", align: "right", cell: (i) => <MoneyText value={Math.round(i.quantidade * i.custo_unit * 100) / 100} /> },
    ...(open
      ? [{
          id: "remove",
          header: "Remover",
          phone: "meta" as const,
          align: "right" as const,
          cell: (i: PurchaseSaleItem) => (
            <Button type="button" variant="ghost" size="icon" aria-label={`Remover ${i.produto_nome} da compra`} onClick={() => onDetach(i)}>
              <Trash2 className="text-danger" aria-hidden />
            </Button>
          ),
        }]
      : []),
  ];

  const stockColumns: DataTableColumn<PurchaseItem>[] = [
    { id: "product", header: "Produto", phone: "title", cell: (i) => i.product_name },
    { id: "qty", header: "Qtd", phone: "meta", align: "right", cell: (i) => <QuantityText value={i.quantity} /> },
    { id: "unit", header: "Custo unit.", phone: "meta", align: "right", cell: (i) => <MoneyText value={i.unit_cost} /> },
    { id: "total", header: "Total", phone: "value", align: "right", cell: (i) => <MoneyText value={Math.round(i.quantity * i.unit_cost * 100) / 100} /> },
    ...(open
      ? [{
          id: "actions",
          header: "Ações",
          phone: "meta" as const,
          align: "right" as const,
          cell: (i: PurchaseItem) => (
            <span className="inline-flex gap-1">
              <Button type="button" variant="ghost" size="icon" aria-label={`Editar ${i.product_name}`} onClick={() => onEditItem(i)}><Pencil aria-hidden /></Button>
              <Button type="button" variant="ghost" size="icon" aria-label={`Remover ${i.product_name}`} onClick={() => onRemoveItem(i)}><Trash2 className="text-danger" aria-hidden /></Button>
            </span>
          ),
        }]
      : []),
  ];

  const replenishment = purchase.kind === "STOCK_REPLENISHMENT";
  return (
    <section id="purchase-items" aria-labelledby="purchase-items-h" className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="purchase-items-h" className="text-sm font-semibold">{replenishment ? "Produtos para o estoque" : "Items das vendas"}</h2>
        {open && (
          <Button type="button" variant="outline" size="sm" onClick={replenishment ? onAddItem : () => router.push("/compras?tab=a-comprar")}>
            <Plus aria-hidden />
            {replenishment ? "Adicionar produto" : "Adicionar da fila"}
          </Button>
        )}
      </div>
      {replenishment ? (
        <DataTable caption="Produtos da compra" rows={purchase.items ?? []} rowKey={(i) => i.id} columns={stockColumns} empty={{ title: "Nenhum produto.", description: "Adicione ao menos um antes de marcar como pedida." }} />
      ) : (
        <DataTable caption="Items das vendas" rows={purchase.sale_items ?? []} rowKey={(i) => i.id} columns={saleColumns} empty={{ title: "Nenhum Item.", description: "Traga Items da fila “a comprar” antes de marcar como pedida." }} />
      )}
      {!open && (
        <p className="text-xs text-muted-foreground">
          {received ? "Compra recebida é definitiva. Diferenças de quantidade se corrigem com um ajuste de estoque." : "Para incluir ou remover Items, volte a compra para Aberta."}
        </p>
      )}
    </section>
  );
}
