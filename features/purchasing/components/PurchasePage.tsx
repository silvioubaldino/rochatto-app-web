"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EntityLink } from "@/components/entity/EntityLink";
import { ActionsMenu, type ActionItem } from "@/components/patterns/ActionsMenu";
import { ConfirmDialog, useUndoToast } from "@/components/patterns/ConfirmDialog";
import { ActionBar, DetailLayout, NextStepBanner, PageHeader, SummaryAside, type NextStep } from "@/components/patterns/detail";
import { PageSkeleton } from "@/components/patterns/skeletons";
import { ErrorState } from "@/components/patterns/states";
import { StatusBadge } from "@/components/patterns/StatusBadge";
import { DateText } from "@/components/patterns/values";
import { useSettleFlow } from "@/components/entity/settle-flow";
import { useSetDelivery } from "@/features/sales/mutations";
import { PURCHASE_KIND_LABELS, docTitle, todayISO } from "@/lib/format";
import { useIsPhone } from "@/lib/media";
import type { AllocationMethod, PurchaseCharge, PurchaseItem, PurchaseSaleItem } from "@/lib/types";
import { nextStep, openPayables, transitionsFor, undoTarget, type PurchaseTransition } from "../model";
import {
  useDeletePurchase,
  useDeletePurchaseCharge,
  useDeletePurchaseItem,
  useDetachSaleItem,
  useRestorePurchaseCharge,
  useRestorePurchaseItem,
  useSetPurchaseStatus,
  useAttachToPurchase,
  useUpdatePurchase,
} from "../mutations";
import { usePurchase, useSalesById } from "../queries";
import { PurchaseChargeDialog } from "./PurchaseChargeDialog";
import { PurchaseCostCard } from "./PurchaseCostCard";
import { PurchaseHeaderDialog } from "./PurchaseHeaderDialog";
import { PurchaseItemDialog } from "./PurchaseItemDialog";
import { PurchaseItemsSection } from "./PurchaseItemsSection";
import { PurchasePayables } from "./PurchasePayables";
import { PurchaseStatusTrail } from "./PurchaseStatusTrail";

/** Compra (T12) no DetailLayout: trilha de status, próximo passo, Items, custo e rateio, contas a pagar. */
export function PurchasePage({ id }: { id: string }) {
  const router = useRouter();
  const phone = useIsPhone();
  const settle = useSettleFlow();
  const undoable = useUndoToast();
  const { purchase, isLoading, error } = usePurchase(id);
  const salesById = useSalesById(!!purchase && purchase.kind === "MADE_TO_ORDER");
  const status = useSetPurchaseStatus();
  const update = useUpdatePurchase(purchase ?? { id, expected_date: null, notes: null, allocation_method: "BY_QUANTITY" });
  const delivery = useSetDelivery();
  const removeCharge = useDeletePurchaseCharge(id);
  const restoreCharge = useRestorePurchaseCharge(id);
  const detach = useDetachSaleItem(id);
  const attach = useAttachToPurchase();
  const removeItem = useDeletePurchaseItem(id);
  const restoreItem = useRestorePurchaseItem(id);
  const del = useDeletePurchase();

  const [header, setHeader] = useState(false);
  const [itemDialog, setItemDialog] = useState<{ item?: PurchaseItem } | null>(null);
  const [chargeDialog, setChargeDialog] = useState<{ charge?: PurchaseCharge } | null>(null);
  const [transition, setTransition] = useState<PurchaseTransition | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (error && !purchase) return <ErrorState message="Compra não encontrada." />;
  if (isLoading || !purchase) return <PageSkeleton className="max-w-6xl" />;

  const open = purchase.status === "OPEN";
  const today = todayISO();
  const step = nextStep(purchase, { today, salesById });
  const payables = (purchase.obligations ?? []).filter((o) => o.direction === "PAYABLE");
  const transitions = transitionsFor(purchase.status, purchase.kind);

  async function runTransition(t: PurchaseTransition) {
    if (t.confirm) return setTransition(t);
    const back = undoTarget(t.to);
    if ((await status.mutate(id, t.to)) !== undefined && back && t.undoMessage) {
      undoable(t.undoMessage, () => status.mutate(id, back));
    }
  }

  async function markDelivered(saleId: string) {
    if ((await delivery.mutate(saleId, "DELIVERED")) !== undefined) {
      undoable("Venda marcada como entregue.", () => delivery.mutate(saleId, "TO_DELIVER"));
    }
  }

  async function removeChargeUndoable(c: PurchaseCharge) {
    if ((await removeCharge.mutate(c.id)) !== undefined) undoable("Custo adicional removido.", () => restoreCharge.mutate(c));
  }
  async function removeItemUndoable(i: PurchaseItem) {
    if ((await removeItem.mutate(i.id)) !== undefined) undoable("Linha removida.", () => restoreItem.mutate(i));
  }
  async function detachUndoable(i: PurchaseSaleItem) {
    if ((await detach.mutate(i.id)) !== undefined) undoable("Item voltou para a fila “a comprar”.", () => attach.mutate(id, [i.id]));
  }

  function payNow() {
    const list = openPayables(purchase?.obligations);
    if (list.length === 1) settle.open({ obligations: list });
    else document.getElementById("purchase-payables")?.scrollIntoView({ block: "center" });
  }

  const uiStep: NextStep | null = step && {
    title: step.title,
    description: step.description,
    tone: step.tone,
    action: {
      label: step.label,
      onClick: () => {
        if (step.id === "add-items") {
          if (purchase?.kind === "STOCK_REPLENISHMENT") setItemDialog({});
          else router.push("/compras?tab=a-comprar");
        } else if (step.id === "mark-ordered") void runTransition(transitions.find((t) => t.to === "ORDERED") as PurchaseTransition);
        else if (step.id === "mark-received") void runTransition(transitions.find((t) => t.to === "RECEIVED") as PurchaseTransition);
        else if (step.id === "deliver") document.getElementById("purchase-items")?.scrollIntoView({ block: "center" });
        else payNow();
      },
    },
  };

  const menu: ActionItem[] = [
    { id: "edit", label: "Editar previsão e observações", onSelect: () => setHeader(true) },
    ...transitions.filter((t) => t.to === "OPEN").map((t) => ({ id: "back-open", label: t.label, onSelect: () => void runTransition(t) })),
    ...(open ? [{ id: "delete", label: "Excluir compra", danger: true, onSelect: () => setDeleting(true) }] : []),
  ];

  const primary = uiStep ? <Button type="button" onClick={uiStep.action.onClick}>{uiStep.action.label}</Button> : undefined;

  return (
    <DetailLayout
      header={
        <PageHeader
          title={docTitle("Compra", purchase.number, purchase.id)}
          subtitle={<><EntityLink type="supplier" id={purchase.supplier_id}>{purchase.supplier_name}</EntityLink> · {PURCHASE_KIND_LABELS[purchase.kind]}</>}
          backFallback="/compras"
          backLabel="Compras"
          badges={<StatusBadge kind="purchase" value={purchase.status} />}
          menu={<ActionsMenu items={menu} />}
        />
      }
      nextStep={
        <div className="space-y-3">
          <PurchaseStatusTrail status={purchase.status} />
          <NextStepBanner step={uiStep} />
        </div>
      }
      aside={
        <SummaryAside
          rows={[
            { label: "Custo da compra", value: purchase.composition.total, strong: true },
            { label: "Pago", value: purchase.paid, tone: "success" },
            { label: "A pagar", value: purchase.open, tone: purchase.open > 0 ? "warning" : undefined },
            { label: "Previsão", value: <DateText value={purchase.expected_date?.slice(0, 10)} /> },
            ...(purchase.ordered_at ? [{ label: "Pedida em", value: <DateText value={purchase.ordered_at.slice(0, 10)} /> }] : []),
            ...(purchase.received_at ? [{ label: "Recebida em", value: <DateText value={purchase.received_at.slice(0, 10)} /> }] : []),
          ]}
        >
          {purchase.notes && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{purchase.notes}</p>}
        </SummaryAside>
      }
      actionBar={phone && primary ? <ActionBar primary={primary} /> : undefined}
    >
      <PurchaseItemsSection
        purchase={purchase}
        sales={salesById}
        onAddItem={() => setItemDialog({})}
        onEditItem={(item) => setItemDialog({ item })}
        onRemoveItem={(i) => void removeItemUndoable(i)}
        onDetach={(i) => void detachUndoable(i)}
        onDeliver={(saleId) => void markDelivered(saleId)}
      />
      <PurchaseCostCard
        purchase={purchase}
        allocationPending={update.pending}
        onAddCharge={() => setChargeDialog({})}
        onEditCharge={(charge) => setChargeDialog({ charge })}
        onRemoveCharge={(c) => void removeChargeUndoable(c)}
        onChangeAllocation={(m: AllocationMethod) => m !== purchase.allocation_method && void update.mutate({ allocation_method: m })}
      />
      <PurchasePayables payables={payables} onPay={(o) => settle.open({ obligations: [o] })} />

      {header && <PurchaseHeaderDialog purchase={purchase} onClose={() => setHeader(false)} />}
      {itemDialog && <PurchaseItemDialog purchaseId={id} item={itemDialog.item} onClose={() => setItemDialog(null)} />}
      {chargeDialog && <PurchaseChargeDialog purchaseId={id} defaultSupplierId={purchase.supplier_id} charge={chargeDialog.charge} onClose={() => setChargeDialog(null)} />}
      <ConfirmDialog
        open={!!transition}
        onOpenChange={(o) => !o && setTransition(null)}
        title={transition?.label ?? ""}
        description={transition?.description}
        confirmLabel={transition?.label}
        onConfirm={() => status.mutateAsync(id, (transition as PurchaseTransition).to)}
      />
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        tone="danger"
        title="Excluir compra"
        description="A compra é excluída e os Items de venda voltam para a fila “a comprar”."
        confirmLabel="Excluir compra"
        onConfirm={async () => {
          await del.mutateAsync(id);
          router.push("/compras");
        }}
      />
    </DetailLayout>
  );
}
