"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api, APIError } from "@/lib/api";
import {
  formatMoeda,
  SALE_CHARGE_KIND_LABELS,
  SALE_COST_KIND_LABELS,
} from "@/lib/formatters";
import type { SaleCharge, SaleCost, Venda } from "@/lib/types";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { SaleChargeModal } from "@/components/sales/SaleChargeModal";
import { SaleCostModal } from "@/components/sales/SaleCostModal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface SaleCompositionCardProps {
  venda: Venda;
  /** Sale CANCELED: cobranças somente leitura (409); custos seguem editáveis (AYD-009 §2). */
  chargesReadOnly: boolean;
  onChanged: () => void;
}

function notifyWarnings(warnings: string[]) {
  if (warnings.includes("OVERSETTLED")) {
    toast.warning("Atenção: a conta já tem mais quitado do que o novo valor devido.");
  }
}

/** "Preço ao cliente" (Items + cobranças) e "Custos da venda" com credor e conta — AYD-009. */
export function SaleCompositionCard({ venda, chargesReadOnly, onChanged }: SaleCompositionCardProps) {
  const composition = venda.composition;
  const [chargeOpen, setChargeOpen] = useState(false);
  const [editingCharge, setEditingCharge] = useState<SaleCharge | undefined>();
  const [deletingCharge, setDeletingCharge] = useState<SaleCharge | null>(null);
  const [costOpen, setCostOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<SaleCost | undefined>();
  const [deletingCost, setDeletingCost] = useState<SaleCost | null>(null);

  if (!composition) return null;

  const obligationsById = new Map((venda.obligations ?? []).map((o) => [o.id, o]));
  // O custo das pedras não é um componente da composição: deriva de preço − lucro − custos.
  const stonesCost = composition.price_total - venda.lucro - composition.costs_total;
  const profit = venda.lucro;

  async function confirmDeleteCharge() {
    if (!deletingCharge) return;
    try {
      await api.delete(`/vendas/${venda.id}/charges/${deletingCharge.id}`);
      toast.success("Cobrança removida.");
      onChanged();
    } catch (err) {
      toast.error(err instanceof APIError ? err.message : "Erro ao remover cobrança.");
    } finally {
      setDeletingCharge(null);
    }
  }

  async function confirmDeleteCost() {
    if (!deletingCost) return;
    try {
      await api.delete(`/vendas/${venda.id}/costs/${deletingCost.id}`);
      toast.success("Custo removido.");
      onChanged();
    } catch (err) {
      toast.error(err instanceof APIError ? err.message : "Erro ao remover custo.");
    } finally {
      setDeletingCost(null);
    }
  }

  return (
    <>
      <Card className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">Preço ao cliente</h2>
          {!chargesReadOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingCharge(undefined);
                setChargeOpen(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Cobrança (frete cobrado)
            </Button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b">
                <td className="py-2 pr-3">Itens (pedras e serviços)</td>
                <td className="py-2 pr-3 text-right">{formatMoeda(composition.items_total)}</td>
                <td className="w-16" />
              </tr>
              {composition.charges.map((c) => (
                <tr key={c.id} className="border-b">
                  <td className="py-2 pr-3">
                    {SALE_CHARGE_KIND_LABELS[c.kind]}
                    {c.description ? <span className="text-muted-foreground"> — {c.description}</span> : null}
                  </td>
                  <td className="py-2 pr-3 text-right">{formatMoeda(c.amount)}</td>
                  <td className="py-2">
                    {!chargesReadOnly && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          title="Editar cobrança"
                          onClick={() => {
                            setEditingCharge(c);
                            setChargeOpen(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-xs" title="Remover" onClick={() => setDeletingCharge(c)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              <tr>
                <td className="py-2 pr-3 font-semibold">Preço ao cliente</td>
                <td className="py-2 pr-3 text-right font-semibold">{formatMoeda(composition.price_total)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">Custos da venda (previsto)</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingCost(undefined);
              setCostOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Custo
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">Custo</th>
                <th className="pb-2 pr-3 font-medium">Credor</th>
                <th className="pb-2 pr-3 font-medium text-right">Previsto</th>
                <th className="pb-2 pr-3 font-medium">Conta</th>
                <th className="pb-2 font-medium w-16">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2 pr-3">Pedras</td>
                <td className="py-2 pr-3 text-muted-foreground">—</td>
                <td className="py-2 pr-3 text-right">{formatMoeda(stonesCost)}</td>
                <td className="py-2 pr-3 text-muted-foreground">—</td>
                <td />
              </tr>
              {composition.costs.map((c) => {
                const obligation = c.obligation_id ? obligationsById.get(c.obligation_id) : undefined;
                return (
                  <tr key={c.id} className="border-b">
                    <td className="py-2 pr-3">
                      {SALE_COST_KIND_LABELS[c.kind]}
                      {c.description ? <span className="text-muted-foreground"> — {c.description}</span> : null}
                    </td>
                    <td className="py-2 pr-3">
                      {c.payee?.name ?? <span className="italic text-muted-foreground">A definir</span>}
                    </td>
                    <td className="py-2 pr-3 text-right">{formatMoeda(c.amount)}</td>
                    <td className="py-2 pr-3">
                      {c.obligation_id ? (
                        <Link href={`/contas/${c.obligation_id}`} className="text-primary hover:underline">
                          {obligation ? `a pagar ${formatMoeda(obligation.open)}` : "ver conta"}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          title="Editar / trocar credor"
                          onClick={() => {
                            setEditingCost(c);
                            setCostOpen(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-xs" title="Remover" onClick={() => setDeletingCost(c)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t pt-3 text-sm sm:max-w-sm">
          <dt className="text-muted-foreground">Custos pagos</dt>
          <dd>{formatMoeda(venda.costs_paid ?? 0)}</dd>
          <dt className="text-muted-foreground">Custos em aberto</dt>
          <dd>{formatMoeda(venda.costs_open ?? 0)}</dd>
          <dt className="font-semibold">Lucro previsto</dt>
          <dd className={`font-semibold ${profit < 0 ? "text-destructive" : "text-green-600"}`}>
            {formatMoeda(composition.price_total)} − {formatMoeda(stonesCost)} − {formatMoeda(composition.costs_total)} ={" "}
            {formatMoeda(profit)}
          </dd>
        </dl>
      </Card>

      <SaleChargeModal
        open={chargeOpen}
        onClose={() => setChargeOpen(false)}
        saleId={venda.id}
        charge={editingCharge}
        onSuccess={onChanged}
      />
      <SaleCostModal
        open={costOpen}
        onClose={() => setCostOpen(false)}
        saleId={venda.id}
        defaultPartnerId={venda.vendedor_externo_id}
        cost={editingCost}
        onSuccess={(warnings) => {
          notifyWarnings(warnings);
          onChanged();
        }}
      />
      <DeleteConfirmDialog
        open={!!deletingCharge}
        onClose={() => setDeletingCharge(null)}
        onConfirm={confirmDeleteCharge}
        title="Remover cobrança"
        description="Remover esta cobrança do preço ao cliente? A conta a receber é recalculada."
      />
      <DeleteConfirmDialog
        open={!!deletingCost}
        onClose={() => setDeletingCost(null)}
        onConfirm={confirmDeleteCost}
        title="Remover custo da venda"
        description="Remover este custo? A conta a pagar do credor é recalculada."
      />
    </>
  );
}
