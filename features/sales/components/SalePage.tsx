"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ActionsMenu, type ActionItem } from "@/components/patterns/ActionsMenu";
import { ConfirmDialog, useUndoToast } from "@/components/patterns/ConfirmDialog";
import { ActionBar, DetailLayout, NextStepBanner, PageHeader, SummaryAside, type NextStep } from "@/components/patterns/detail";
import { PageSkeleton } from "@/components/patterns/skeletons";
import { ErrorState } from "@/components/patterns/states";
import { StatusBadge } from "@/components/patterns/StatusBadge";
import { useSettleFlow } from "@/components/entity/settle-flow";
import { useGeneratePurchase, useAttachToPurchase } from "@/features/purchasing/mutations";
import { useStockBalance } from "@/features/stock/queries";
import { useVenda } from "@/hooks/useVenda";
import { docTitle, isServiceOnlySale, todayISO } from "@/lib/format";
import { useIsPhone } from "@/lib/media";
import { cancelBlockedReason, nextStep } from "../model";
import { useCancelSale, useSetDelivery } from "../mutations";
import { usePurchaseMap, useSaleObligations } from "../queries";
import { BatchFulfillmentDialog } from "./BatchFulfillmentDialog";
import { SaleDetailsCard } from "./SaleDetailsCard";
import { SaleItemsSection } from "./SaleItemsSection";
import { SalePayablesCard } from "./SalePayablesCard";
import { SaleComposition } from "./SaleComposition";
import { SaleReceivableCard } from "./SaleReceivableCard";
import { SetPlanDialog } from "./SetPlanDialog";

/** Venda (T06) no DetailLayout: próximo passo, Items e atendimento, preço e custos, recebimento, contas a pagar, dados. */
export function SalePage({ id }: { id: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const phone = useIsPhone();
  const settle = useSettleFlow();
  const undoable = useUndoToast();
  const { venda, isLoading, error } = useVenda(id);
  const purchases = usePurchaseMap();
  const { receivable, payables } = useSaleObligations(id);
  const { balances } = useStockBalance();
  const delivery = useSetDelivery();
  const cancel = useCancelSale();
  const generate = useGeneratePurchase();
  const attach = useAttachToPurchase();

  const [fulfillOpen, setFulfillOpen] = useState(() => params.get("atendimento") === "1");
  const [planOpen, setPlanOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  if (error) return <ErrorState message="Venda não encontrada." />;
  if (isLoading || !venda) return <PageSkeleton className="max-w-6xl" />;

  const readOnly = venda.delivery_status === "CANCELED";
  const serviceOnly = isServiceOnlySale(venda.itens);
  const today = todayISO();
  const step = nextStep(venda, { today, purchases, receivable });
  const balanceMap = new Map(balances.map((b) => [b.product_id, b.balance]));
  const productItems = (venda.itens ?? []).filter((i) => (i.kind ?? "PRODUCT") === "PRODUCT" && !i.purchase_id);
  const blocked = cancelBlockedReason(venda, purchases);

  async function markDelivered(to: "DELIVERED" | "TO_DELIVER") {
    if (await delivery.mutate(id, to)) {
      undoable(to === "DELIVERED" ? "Venda marcada como entregue." : "Venda voltou para a entregar.", () => delivery.mutate(id, to === "DELIVERED" ? "TO_DELIVER" : "DELIVERED"));
    }
  }

  async function generatePurchases(supplierIds: string[]) {
    for (const supplierId of supplierIds) {
      const ids = (venda?.itens ?? []).filter((i) => i.origin === "MADE_TO_ORDER" && !i.purchase_id && i.fornecedor_id === supplierId).map((i) => i.id);
      const open = Object.values(purchases).find((p) => p.supplier_id === supplierId && p.status === "OPEN");
      if (supplierIds.length === 1 && open) return void (await attach.mutate(open.id, ids));
      const created = await generate.mutate(supplierId, ids);
      if (created && supplierIds.length === 1) router.push(`/compras/${created.id}`);
    }
  }

  const openPurchaseNumber = step?.supplierIds?.length === 1 ? Object.values(purchases).find((p) => p.supplier_id === step.supplierIds?.[0] && p.status === "OPEN") : undefined;
  const uiStep: NextStep | null = step && {
    title: step.title,
    description: step.description,
    tone: step.tone,
    action: {
      label: step.id === "generate-purchase" && openPurchaseNumber ? `Adicionar à Compra nº ${openPurchaseNumber.number ?? ""}`.trim() : step.label,
      onClick: () => {
        if (step.id === "define-fulfillment") setFulfillOpen(true);
        else if (step.id === "generate-purchase") void generatePurchases(step.supplierIds ?? []);
        else if (step.id === "define-plan") setPlanOpen(true);
        else if (step.id === "receive-overdue" || step.id === "receive") {
          if (receivable) settle.open({ obligations: [receivable] });
        }
        else if (step.id === "deliver") void markDelivered("DELIVERED");
        else if (step.id === "define-payee") document.getElementById("sale-costs")?.scrollIntoView({ block: "center" });
      },
    },
  };

  const menu: ActionItem[] = readOnly
    ? []
    : [
        venda.delivery_status === "DELIVERED"
          ? { id: "undeliver", label: serviceOnly ? "Voltar para a executar" : "Voltar para a entregar", onSelect: () => void markDelivered("TO_DELIVER") }
          : { id: "deliver", label: serviceOnly ? "Marcar como executado" : "Marcar como entregue", onSelect: () => void markDelivered("DELIVERED") },
        ...(venda.quote_id ? [{ id: "quote", label: "Ver orçamento", onSelect: () => router.push(`/orcamentos/${venda.quote_id}`) }] : []),
        { id: "cancel", label: "Cancelar venda", danger: true, onSelect: () => setCancelOpen(true), disabled: !!blocked, disabledReason: blocked ?? undefined },
      ];

  const primary = step && step.id !== "define-payee" ? (
    <Button type="button" onClick={uiStep?.action.onClick}>{uiStep?.action.label}</Button>
  ) : undefined;

  return (
    <DetailLayout
      header={
        <PageHeader
          title={docTitle("Venda", venda.number, venda.id, venda.cliente_nome)}
          backFallback="/vendas"
          backLabel="Vendas"
          badges={
            <>
              <StatusBadge kind="saleDelivery" value={venda.delivery_status} serviceOnly={serviceOnly} />
              <StatusBadge kind="salePayment" value={venda.payment_status} />
            </>
          }
          menu={<ActionsMenu items={menu} />}
        />
      }
      nextStep={<NextStepBanner step={uiStep} />}
      aside={
        <SummaryAside
          rows={[
            { label: "Preço ao cliente", value: venda.total_venda, strong: true },
            { label: "Custo", value: venda.total_custo },
            { label: "Lucro previsto", value: venda.lucro },
            { label: "Margem", value: venda.total_venda > 0 ? `${((venda.lucro / venda.total_venda) * 100).toFixed(1).replace(".", ",")}%` : "—" },
            { label: "Recebido", value: venda.total_recebido, tone: "success" },
            { label: "A receber", value: venda.receivable, tone: venda.receivable > 0 ? "warning" : undefined },
          ]}
        />
      }
      actionBar={phone && primary ? <ActionBar primary={primary} /> : undefined}
    >
      {readOnly && <p role="status" className="rounded-lg bg-neutral-subtle px-4 py-3 text-neutral">Venda cancelada: somente leitura. Ela não entra nos totais, no lucro, no a receber, na fila de compras nem nas saídas de estoque.</p>}
      <SaleItemsSection
        key={(venda.itens ?? []).map((i) => [i.id, i.quantidade, i.preco_venda_unit, i.custo_unit, i.origin, i.fornecedor_id, i.purchase_id].join(":")).join("|")}
        sale={venda}
        purchases={purchases}
        readOnly={readOnly}
        onDefineFulfillment={() => setFulfillOpen(true)}
      />
      <SaleComposition sale={venda} chargesReadOnly={readOnly} />
      <SaleReceivableCard receivable={receivable} readOnly={readOnly} onReceive={(o) => settle.open({ obligations: [o] })} onDefinePlan={() => setPlanOpen(true)} />
      <SalePayablesCard payables={payables} readOnly={readOnly} onPay={(o) => settle.open({ obligations: [o] })} />
      <SaleDetailsCard sale={venda} readOnly={readOnly} />

      <BatchFulfillmentDialog open={fulfillOpen} onOpenChange={setFulfillOpen} saleId={id} items={productItems} balances={balanceMap} />
      {receivable && <SetPlanDialog open={planOpen} onOpenChange={setPlanOpen} obligationId={receivable.id} total={receivable.amount} />}
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        tone="danger"
        title="Cancelar venda"
        description="A venda cancelada sai dos totais, do lucro, do a receber, da fila de compras e das saídas de estoque. Items em compras abertas são liberados. Só é possível se nenhum item estiver em compra pedida ou recebida. O cancelamento é definitivo; recebimentos já registrados ficam como estão."
        confirmLabel="Cancelar venda"
        disabledReason={blocked ?? undefined}
        onConfirm={() => cancel.mutateAsync(id)}
      />
    </DetailLayout>
  );
}
