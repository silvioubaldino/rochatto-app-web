"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettleFlow } from "@/components/entity/settle-flow";
import { ActionsMenu, type ActionItem } from "@/components/patterns/ActionsMenu";
import { useUndoToast } from "@/components/patterns/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/patterns/DataTable";
import { ActionBar, DetailLayout, PageHeader, SummaryAside } from "@/components/patterns/detail";
import { PageSkeleton } from "@/components/patterns/skeletons";
import { ErrorState } from "@/components/patterns/states";
import { StatusBadge } from "@/components/patterns/StatusBadge";
import { DateText, MoneyText } from "@/components/patterns/values";
import {
  MOVEMENT_CATEGORY_LABELS,
  OBLIGATION_ORIGIN_LABELS,
  OBLIGATION_WARNING_MESSAGES,
  PAYMENT_METHOD_LABELS,
  formatComponentLabel,
  formatCounterparty,
  formatMoney,
  obligationOriginHref,
} from "@/lib/format";
import { useIsPhone } from "@/lib/media";
import type { Installment, ObligationComponent, ObligationSettlement } from "@/lib/types";
import { obligationDue, obligationTitle, obligationVerb, partyLabel } from "../model";
import { useRestoreSettlement, useUndoSettlement } from "../mutations";
import { useObligation } from "../queries";
import { ObligationPatchDialog } from "./ObligationPatchDialog";
import { PlanDialog } from "./PlanDialog";

/** Detalhe da conta (T14): resumo, componentes, parcelas (plano) e quitações, com Pagar/Receber e desfazer. */
export function ObligationPage({ id }: { id: string }) {
  const phone = useIsPhone();
  const settle = useSettleFlow();
  const undoable = useUndoToast();
  const { obligation, isLoading, error, refresh } = useObligation(id);
  const undo = useUndoSettlement();
  const restore = useRestoreSettlement();
  const [plan, setPlan] = useState(false);
  const [patch, setPatch] = useState(false);

  if (error && !obligation) return <ErrorState message="Conta não encontrada." />;
  if (isLoading || !obligation) return <PageSkeleton className="max-w-6xl" />;

  const o = obligation;
  const receiving = o.direction === "RECEIVABLE";
  const verb = obligationVerb(o.direction);
  const installments = o.installments ?? [];
  const oversettled = o.settled > o.amount || !!o.warnings?.includes("OVERSETTLED");

  async function undoSettlement(s: ObligationSettlement) {
    if ((await undo.mutate(s.id)) !== undefined) undoable("Quitação desfeita. A movimentação continua na lista.", () => restore.mutate(o.id, s));
  }

  const componentColumns: DataTableColumn<ObligationComponent>[] = [
    { id: "label", header: "Componente", phone: "title", cell: (c) => formatComponentLabel(c) },
    { id: "amount", header: "Valor", phone: "value", align: "right", cell: (c) => <MoneyText value={c.amount} /> },
  ];
  const installmentColumns: DataTableColumn<Installment>[] = [
    { id: "due", header: "Vencimento", phone: "title", cell: (i) => <DateText value={i.due_date.slice(0, 10)} tone={i.overdue && i.status !== "COVERED" ? "danger" : undefined} /> },
    { id: "amount", header: "Valor", phone: "value", align: "right", cell: (i) => <MoneyText value={i.amount} /> },
    { id: "covered", header: "Coberto", phone: "meta", align: "right", cell: (i) => <MoneyText value={i.covered} tone="success" /> },
    { id: "method", header: "Forma", phone: "meta", cell: (i) => (i.payment_method ? PAYMENT_METHOD_LABELS[i.payment_method] : "—") },
    { id: "status", header: "Situação", phone: "badge", cell: (i) => <StatusBadge kind="installment" value={i.status} overdue={i.overdue && i.status !== "COVERED"} /> },
  ];
  const settlementColumns: DataTableColumn<ObligationSettlement>[] = [
    { id: "date", header: "Data", phone: "title", cell: (s) => <DateText value={s.movement.occurred_on.slice(0, 10)} /> },
    { id: "amount", header: "Quitado", phone: "value", align: "right", cell: (s) => <MoneyText value={s.amount} tone="success" /> },
    { id: "method", header: "Forma", phone: "meta", cell: (s) => (s.movement.payment_method ? PAYMENT_METHOD_LABELS[s.movement.payment_method] : "—") },
    { id: "category", header: "Categoria", phone: "meta", cell: (s) => MOVEMENT_CATEGORY_LABELS[s.movement.category] ?? "—" },
    { id: "movement", header: "Movimentação", phone: "hidden", align: "right", cell: (s) => <MoneyText value={s.movement.amount} /> },
    {
      id: "undo",
      header: "Desfazer",
      phone: "meta",
      align: "right",
      cell: (s) => (
        <Button type="button" variant="ghost" size="sm" disabled={undo.pending} aria-label={`Desfazer a quitação de ${formatMoney(s.amount)}`} onClick={() => void undoSettlement(s)}>
          <Undo2 aria-hidden />
          Desfazer
        </Button>
      ),
    },
  ];

  const menu: ActionItem[] = [
    { id: "patch", label: "Editar prazo e observações", onSelect: () => setPatch(true) },
    { id: "plan", label: installments.length > 0 ? "Editar parcelas" : "Definir parcelas", onSelect: () => setPlan(true) },
  ];
  const primary = o.open > 0 ? <Button type="button" onClick={() => settle.open({ obligations: [o], onClosed: () => void refresh() })}>{verb}</Button> : undefined;

  return (
    <DetailLayout
      header={
        <PageHeader
          title={obligationTitle(o)}
          subtitle={<Link href={obligationOriginHref(o.origin)} className="underline-offset-4 hover:underline">{OBLIGATION_ORIGIN_LABELS[o.origin.type]} · {o.origin.label}</Link>}
          backFallback={receiving ? "/contas/receber" : "/contas/pagar"}
          backLabel={receiving ? "A receber" : "A pagar"}
          badges={
            <>
              <StatusBadge kind="obligation" value={o.status} />
              {o.overdue && o.open > 0 && <StatusBadge tone="danger">Vencida</StatusBadge>}
            </>
          }
          actions={primary}
          menu={<ActionsMenu items={menu} />}
        />
      }
      aside={
        <SummaryAside
          rows={[
            { label: "Valor", value: o.amount, strong: true },
            { label: receiving ? "Recebido" : "Pago", value: o.settled, tone: "success" },
            { label: "Em aberto", value: o.open, tone: o.open > 0 ? (o.overdue ? "danger" : "warning") : undefined },
            { label: partyLabel(o.direction), value: formatCounterparty(o.counterparty) },
            { label: "Vencimento", value: <DateText value={obligationDue(o)} tone={o.overdue && o.open > 0 ? "danger" : undefined} /> },
            { label: "Prazo final", value: <DateText value={o.due_date?.slice(0, 10)} /> },
          ]}
        >
          {o.notes && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{o.notes}</p>}
        </SummaryAside>
      }
      actionBar={phone && primary ? <ActionBar primary={primary} /> : undefined}
    >
      {oversettled && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-warning-subtle px-4 py-3 text-warning">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {OBLIGATION_WARNING_MESSAGES.OVERSETTLED}
        </p>
      )}

      <section aria-labelledby="ob-components-h" className="space-y-3 rounded-lg border bg-card p-4">
        <h2 id="ob-components-h" className="text-sm font-semibold">Componentes</h2>
        <DataTable caption="Componentes da conta" rows={o.components ?? []} rowKey={(c) => `${c.type}-${c.id}`} columns={componentColumns} empty={{ title: "Sem componentes." }} />
      </section>

      <section aria-labelledby="ob-plan-h" className="space-y-3 rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="ob-plan-h" className="text-sm font-semibold">Parcelas</h2>
          <Button type="button" variant="outline" size="sm" onClick={() => setPlan(true)}>{installments.length > 0 ? "Editar parcelas" : "Definir parcelas"}</Button>
        </div>
        <DataTable caption="Parcelas da conta" rows={installments} rowKey={(i) => i.id} columns={installmentColumns} empty={{ title: "Sem parcelas definidas.", description: "A parcela é plano, não dinheiro: o que foi quitado cobre as parcelas por ordem de vencimento." }} />
      </section>

      <section aria-labelledby="ob-settlements-h" className="space-y-3 rounded-lg border bg-card p-4">
        <h2 id="ob-settlements-h" className="text-sm font-semibold">Quitações</h2>
        <DataTable caption="Quitações da conta" rows={o.settlements ?? []} rowKey={(s) => s.id} columns={settlementColumns} empty={{ title: "Nenhuma quitação registrada." }} />
      </section>

      {plan && <PlanDialog obligation={o} onClose={() => setPlan(false)} />}
      {patch && <ObligationPatchDialog obligation={o} onClose={() => setPatch(false)} />}
    </DetailLayout>
  );
}
