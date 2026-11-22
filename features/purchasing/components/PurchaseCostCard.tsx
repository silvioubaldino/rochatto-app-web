"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionsMenu } from "@/components/patterns/ActionsMenu";
import { DataTable, type DataTableColumn } from "@/components/patterns/DataTable";
import { FieldShell } from "@/components/patterns/fields";
import { Select } from "@/components/patterns/Select";
import { MoneyText, QuantityText } from "@/components/patterns/values";
import { ALLOCATION_METHODS, ALLOCATION_METHOD_LABELS, PURCHASE_CHARGE_KIND_LABELS, formatMoney } from "@/lib/format";
import type { AllocationMethod, PurchaseCharge, PurchaseDetail, PurchaseLine } from "@/lib/types";

const METHOD_OPTIONS = ALLOCATION_METHODS.map((m) => ({ value: m, label: ALLOCATION_METHOD_LABELS[m] }));

interface Row {
  id: string;
  label: string;
  payee: string | null;
  amount: number;
  charge?: PurchaseCharge;
}

/** Custo e rateio (T12): composição por credor, método de rateio e custo de entrada por linha, num cartão só. */
export function PurchaseCostCard({
  purchase,
  readOnlyAllocation,
  allocationPending,
  onAddCharge,
  onEditCharge,
  onRemoveCharge,
  onChangeAllocation,
}: {
  purchase: PurchaseDetail;
  readOnlyAllocation?: boolean;
  allocationPending: boolean;
  onAddCharge: () => void;
  onEditCharge: (c: PurchaseCharge) => void;
  onRemoveCharge: (c: PurchaseCharge) => void;
  onChangeAllocation: (m: AllocationMethod) => void;
}) {
  const c = purchase.composition;
  const rows: Row[] = [
    { id: "goods", label: `Pedras (${purchase.lines.length} ${purchase.lines.length === 1 ? "item" : "itens"})`, payee: purchase.supplier_name, amount: c.goods_total },
    ...c.charges.map((ch) => ({
      id: ch.id,
      label: `${PURCHASE_CHARGE_KIND_LABELS[ch.kind]}${ch.description ? ` — ${ch.description}` : ""}`,
      payee: ch.payee_name,
      amount: ch.amount,
      charge: ch,
    })),
  ];

  const componentColumns: DataTableColumn<Row>[] = [
    { id: "label", header: "Componente", phone: "title", cell: (r) => r.label },
    { id: "payee", header: "Credor", phone: "subtitle", cell: (r) => r.payee ?? <span className="italic text-muted-foreground">A definir</span> },
    { id: "amount", header: "Valor", phone: "value", align: "right", cell: (r) => <MoneyText value={r.amount} /> },
    {
      id: "actions",
      header: "Ações",
      phone: "meta",
      align: "right",
      cell: (r) =>
        r.charge ? (
          <ActionsMenu
            label={`Ações de ${r.label}`}
            items={[
              { id: "edit", label: "Editar ou trocar o credor", onSelect: () => onEditCharge(r.charge as PurchaseCharge) },
              { id: "remove", label: "Remover", danger: true, onSelect: () => onRemoveCharge(r.charge as PurchaseCharge) },
            ]}
          />
        ) : null,
    },
  ];

  const lineColumns: DataTableColumn<PurchaseLine>[] = [
    { id: "product", header: "Produto", phone: "title", cell: (l) => l.product_name },
    { id: "qty", header: "Qtd", phone: "meta", align: "right", cell: (l) => <QuantityText value={l.quantity} unit={l.unit} /> },
    { id: "base", header: "Base", phone: "hidden", align: "right", cell: (l) => <MoneyText value={l.base_cost} /> },
    { id: "alloc", header: "Rateado", phone: "meta", align: "right", cell: (l) => <MoneyText value={l.allocated_charges} /> },
    { id: "landed", header: "Total c/ custos", phone: "hidden", align: "right", cell: (l) => <MoneyText value={l.landed_total} /> },
    { id: "unit", header: "Custo unit. de entrada", phone: "value", align: "right", cell: (l) => <MoneyText value={l.landed_unit_cost} className="font-medium" /> },
  ];

  return (
    <section aria-labelledby="purchase-cost-h" className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="purchase-cost-h" className="text-sm font-semibold">Custo e rateio</h2>
        <Button type="button" variant="outline" size="sm" onClick={onAddCharge}>
          <Plus aria-hidden />
          Custo adicional
        </Button>
      </div>
      <DataTable
        caption="Composição do custo"
        rows={rows}
        rowKey={(r) => r.id}
        columns={componentColumns}
        summary={<span className="flex justify-between gap-4"><span>Custo da compra</span><span>{formatMoney(c.total)} <span className="text-xs font-normal text-muted-foreground">(custos adicionais {formatMoney(c.charges_total)})</span></span></span>}
      />
      <FieldShell label="Rateio dos custos adicionais" htmlFor="alloc-method" hint="Como os custos adicionais se dividem entre as linhas para formar o custo de entrada.">
        <div className="max-w-xs">
          <Select id="alloc-method" value={purchase.allocation_method} disabled={allocationPending || readOnlyAllocation} onChange={(v) => onChangeAllocation(v as AllocationMethod)} options={METHOD_OPTIONS} />
        </div>
      </FieldShell>
      {purchase.lines.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Custo de entrada por linha</h3>
          <DataTable caption="Custo de entrada por linha" rows={purchase.lines} rowKey={(l) => `${l.line_type}-${l.line_id}`} columns={lineColumns} />
        </div>
      )}
    </section>
  );
}
