"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionsMenu } from "@/components/patterns/ActionsMenu";
import { useUndoToast } from "@/components/patterns/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/patterns/DataTable";
import { MoneyText } from "@/components/patterns/values";
import { SALE_CHARGE_KIND_LABELS, SALE_COST_KIND_LABELS, formatMoney } from "@/lib/format";
import type { SaleCharge, SaleCost, Venda } from "@/lib/types";
import { saleBreakdown } from "../model";
import {
  useDeleteSaleCharge,
  useDeleteSaleCost,
  useRestoreSaleCharge,
  useRestoreSaleCost,
} from "../mutations";
import { SaleChargeDialog } from "./SaleChargeDialog";
import { SaleCostDialog } from "./SaleCostDialog";

interface PriceRow {
  id: string;
  label: string;
  amount: number;
  charge?: SaleCharge;
}
interface CostRow {
  id: string;
  label: string;
  payee: string | null;
  amount: number;
  cost?: SaleCost;
}

export function SaleComposition({ sale, chargesReadOnly }: { sale: Venda; chargesReadOnly: boolean }) {
  const undoable = useUndoToast();
  const removeCharge = useDeleteSaleCharge(sale.id);
  const restoreCharge = useRestoreSaleCharge(sale.id);
  const removeCost = useDeleteSaleCost(sale.id);
  const restoreCost = useRestoreSaleCost(sale.id);
  const [chargeDialog, setChargeDialog] = useState<{ charge?: SaleCharge } | null>(null);
  const [costDialog, setCostDialog] = useState<{ cost?: SaleCost } | null>(null);

  const breakdown = saleBreakdown(sale);
  const c = sale.composition;
  if (!c || !breakdown) return null;
  const obligations = new Map((sale.obligations ?? []).map((o) => [o.id, o]));

  const priceRows: PriceRow[] = [
    { id: "items", label: "Items (pedras e serviços)", amount: c.items_total },
    ...c.charges.map((ch) => ({ id: ch.id, label: `${SALE_CHARGE_KIND_LABELS[ch.kind]}${ch.description ? ` — ${ch.description}` : ""}`, amount: ch.amount, charge: ch })),
  ];
  const costRows: CostRow[] = [
    { id: "stones", label: "Pedras", payee: null, amount: breakdown.stones },
    ...c.costs.map((k) => ({ id: k.id, label: `${SALE_COST_KIND_LABELS[k.kind]}${k.description ? ` — ${k.description}` : ""}`, payee: k.payee?.name ?? null, amount: k.amount, cost: k })),
  ];

  async function dropCharge(ch: SaleCharge) {
    if ((await removeCharge.mutate(ch.id)) !== undefined) undoable("Cobrança removida.", () => restoreCharge.mutate(ch));
  }
  async function dropCost(k: SaleCost) {
    if ((await removeCost.mutate(k.id)) !== undefined) undoable("Custo removido.", () => restoreCost.mutate(k));
  }

  const priceColumns: DataTableColumn<PriceRow>[] = [
    { id: "label", header: "Componente", phone: "title", cell: (r) => r.label },
    { id: "amount", header: "Valor", phone: "value", align: "right", cell: (r) => <MoneyText value={r.amount} /> },
    {
      id: "actions",
      header: "Ações",
      phone: "meta",
      align: "right",
      cell: (r) =>
        r.charge && !chargesReadOnly ? (
          <ActionsMenu label={`Ações de ${r.label}`} items={[
            { id: "edit", label: "Editar cobrança", onSelect: () => setChargeDialog({ charge: r.charge }) },
            { id: "remove", label: "Remover", danger: true, onSelect: () => void dropCharge(r.charge as SaleCharge) },
          ]} />
        ) : null,
    },
  ];

  const costColumns: DataTableColumn<CostRow>[] = [
    { id: "label", header: "Custo", phone: "title", cell: (r) => r.label },
    { id: "payee", header: "Credor", phone: "subtitle", cell: (r) => (r.cost ? (r.payee ?? <span className="italic text-muted-foreground">A definir</span>) : "—") },
    { id: "amount", header: "Previsto", phone: "value", align: "right", cell: (r) => <MoneyText value={r.amount} /> },
    {
      id: "account",
      header: "Conta",
      phone: "meta",
      cell: (r) => {
        if (!r.cost?.obligation_id) return <span className="text-muted-foreground">—</span>;
        const o = obligations.get(r.cost.obligation_id);
        return <Link href={`/contas/${r.cost.obligation_id}`} className="relative z-10 underline-offset-4 hover:underline">{o ? `a pagar ${formatMoney(o.open)}` : "ver conta"}</Link>;
      },
    },
    {
      id: "actions",
      header: "Ações",
      phone: "meta",
      align: "right",
      cell: (r) =>
        r.cost ? (
          <ActionsMenu label={`Ações de ${r.label}`} items={[
            { id: "edit", label: "Editar ou trocar o credor", onSelect: () => setCostDialog({ cost: r.cost }) },
            { id: "remove", label: "Remover", danger: true, onSelect: () => void dropCost(r.cost as SaleCost) },
          ]} />
        ) : null,
    },
  ];

  return (
    <>
      <section aria-labelledby="sale-price-h" className="space-y-3 rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="sale-price-h" className="text-sm font-semibold">Preço ao cliente</h2>
          {!chargesReadOnly && (
            <Button type="button" variant="outline" size="sm" onClick={() => setChargeDialog({})}>
              <Plus aria-hidden />
              Cobrança (frete cobrado)
            </Button>
          )}
        </div>
        <DataTable
          caption="Preço ao cliente"
          rows={priceRows}
          rowKey={(r) => r.id}
          columns={priceColumns}
          summary={<span className="flex justify-between gap-4"><span>Preço ao cliente</span><span>{formatMoney(c.price_total)}</span></span>}
        />
      </section>

      <section id="sale-costs" aria-labelledby="sale-costs-h" className="space-y-3 rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="sale-costs-h" className="text-sm font-semibold">Custos da venda (previsto)</h2>
          <Button type="button" variant="outline" size="sm" onClick={() => setCostDialog({})}>
            <Plus aria-hidden />
            Custo
          </Button>
        </div>
        <DataTable caption="Custos da venda" rows={costRows} rowKey={(r) => r.id} columns={costColumns} />
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t pt-3 text-sm sm:max-w-md">
          <dt className="text-muted-foreground">Custos pagos</dt>
          <dd><MoneyText value={sale.costs_paid ?? 0} /></dd>
          <dt className="text-muted-foreground">Custos em aberto</dt>
          <dd><MoneyText value={sale.costs_open ?? 0} /></dd>
          <dt className="font-semibold">Lucro previsto</dt>
          <dd className="font-semibold"><MoneyText value={breakdown.profit} tone={breakdown.profit < 0 ? "danger" : "success"} /> <span className="font-normal text-muted-foreground">= {formatMoney(breakdown.price)} − {formatMoney(breakdown.stones)} − {formatMoney(breakdown.costs)}</span></dd>
        </dl>
      </section>

      {chargeDialog && <SaleChargeDialog saleId={sale.id} charge={chargeDialog.charge} onClose={() => setChargeDialog(null)} />}
      {costDialog && <SaleCostDialog saleId={sale.id} referrerId={sale.vendedor_externo_id} cost={costDialog.cost} onClose={() => setCostDialog(null)} />}
    </>
  );
}
