"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useBack } from "@/lib/history";
import { useSWRConfig } from "swr";
import { AlertTriangle, ArrowLeft, CalendarPlus, Pencil, Wallet } from "lucide-react";
import { isAccountingKey, useObligation } from "@/hooks/useObligations";
import {
  DIRECTION_LABELS,
  OBLIGATION_ORIGIN_LABELS,
  OBLIGATION_WARNING_MESSAGES,
  formatComponentLabel,
  formatCounterparty,
  formatData,
  formatMoeda,
  obligationOriginHref,
} from "@/lib/formatters";
import type { ObligationSettlement } from "@/lib/types";
import { ObligationStatusBadge, OverdueBadge } from "@/components/status-badges";
import { SettleDialog } from "@/components/obligations/SettleDialog";
import { GenerateInstallmentsDialog } from "@/components/obligations/GenerateInstallmentsDialog";
import { InstallmentsEditor } from "@/components/obligations/InstallmentsEditor";
import { InstallmentsList } from "@/components/obligations/InstallmentsList";
import { ObligationPatchDialog } from "@/components/obligations/ObligationPatchDialog";
import { SettlementsList } from "@/components/obligations/SettlementsList";
import { UndoSettlementDialog } from "@/components/obligations/UndoSettlementDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Detalhe da conta — AYD-007 §2–3, §5.

export default function ContaDetalhePage() {
  const params = useParams();
  const back = useBack("/contas");
  const id = params.id as string;
  const { mutate } = useSWRConfig();
  const { obligation, isLoading, error, refresh } = useObligation(id);

  const [settleOpen, setSettleOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [patchOpen, setPatchOpen] = useState(false);
  const [undoing, setUndoing] = useState<ObligationSettlement | null>(null);

  function refreshAll() {
    refresh();
    mutate(isAccountingKey);
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !obligation) {
    return (
      <div className="max-w-4xl space-y-3">
        <Button variant="ghost" size="sm" onClick={back}>
          <ArrowLeft className="h-4 w-4" />
          Contas
        </Button>
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "Conta não encontrada."}
        </p>
      </div>
    );
  }

  const receiving = obligation.direction === "RECEIVABLE";
  const components = obligation.components ?? [];
  const installments = obligation.installments ?? [];
  const settlements = obligation.settlements ?? [];
  const oversettled = obligation.settled > obligation.amount;
  const canSettle = obligation.open > 0;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon" onClick={back} title="Voltar">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">
          Conta {DIRECTION_LABELS[obligation.direction].toLowerCase()}
        </h1>
        <ObligationStatusBadge status={obligation.status} />
        {obligation.overdue && <OverdueBadge />}
        <div className="ml-auto flex flex-wrap gap-2">
          {canSettle && (
            <Button size="sm" onClick={() => setSettleOpen(true)}>
              <Wallet className="h-3.5 w-3.5" />
              {receiving ? "Receber" : "Pagar"}
            </Button>
          )}
        </div>
      </div>

      {(obligation.warnings?.includes("OVERSETTLED") || oversettled) && (
        <div className="flex items-start gap-2 rounded-md border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{OBLIGATION_WARNING_MESSAGES.OVERSETTLED}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase text-muted-foreground">Dados da conta</h2>
            <Button variant="ghost" size="icon-xs" onClick={() => setPatchOpen(true)} title="Editar prazo e observações">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">{receiving ? "Cliente" : "Credor"}</dt>
            <dd className="font-medium">{formatCounterparty(obligation.counterparty)}</dd>
            <dt className="text-muted-foreground">Origem</dt>
            <dd>
              <Link href={obligationOriginHref(obligation.origin)} className="text-primary hover:underline">
                {OBLIGATION_ORIGIN_LABELS[obligation.origin.type]} · {obligation.origin.label}
              </Link>
            </dd>
            <dt className="text-muted-foreground">Prazo final</dt>
            <dd>{obligation.due_date ? formatData(obligation.due_date) : "—"}</dd>
            <dt className="text-muted-foreground">Próxima parcela</dt>
            <dd>
              {obligation.next_installment
                ? `${formatData(obligation.next_installment.due_date)} · ${formatMoeda(obligation.next_installment.amount_open)}`
                : "—"}
            </dd>
            <dt className="text-muted-foreground">Observações</dt>
            <dd className="whitespace-pre-wrap">{obligation.notes || "—"}</dd>
          </dl>
        </Card>

        <Card className="space-y-3 p-4">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">Resumo</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Valor</dt>
            <dd className="font-semibold">{formatMoeda(obligation.amount)}</dd>
            <dt className="text-muted-foreground">{receiving ? "Recebido" : "Pago"}</dt>
            <dd className="text-green-600">{formatMoeda(obligation.settled)}</dd>
            <dt className="text-muted-foreground">Em aberto</dt>
            <dd className="font-semibold text-orange-600">{formatMoeda(obligation.open)}</dd>
            <dt className="text-muted-foreground">Situação</dt>
            <dd>
              <ObligationStatusBadge status={obligation.status} />
            </dd>
          </dl>
        </Card>
      </div>

      <Card className="space-y-3 p-4">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground">Componentes</h2>
        {components.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem componentes.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {components.map((c) => (
                <tr key={`${c.type}-${c.id}`} className="border-b last:border-b-0">
                  <td className="py-2 pr-4">{formatComponentLabel(c)}</td>
                  <td className="py-2 text-right tabular-nums">{formatMoeda(c.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">Parcelas</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setGenerateOpen(true)}>
              <CalendarPlus className="h-3.5 w-3.5" />
              Gerar parcelas
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditorOpen(true)}>
              <Pencil className="h-3.5 w-3.5" />
              Editar parcelas
            </Button>
          </div>
        </div>
        <InstallmentsList installments={installments} />
        <p className="text-xs text-muted-foreground">
          A parcela é plano, não dinheiro: o que foi quitado cobre as parcelas por ordem de vencimento.
        </p>
      </Card>

      <Card className="space-y-3 p-4">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground">Quitações</h2>
        <SettlementsList settlements={settlements} onUndo={setUndoing} />
      </Card>

      <SettleDialog
        open={settleOpen}
        onClose={() => setSettleOpen(false)}
        obligation={obligation}
        onDone={refreshAll}
      />
      <GenerateInstallmentsDialog
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        obligation={obligation}
        onDone={refreshAll}
      />
      <InstallmentsEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        obligation={obligation}
        installments={installments}
        onDone={refreshAll}
      />
      <ObligationPatchDialog
        open={patchOpen}
        onClose={() => setPatchOpen(false)}
        obligation={obligation}
        onDone={refreshAll}
      />
      <UndoSettlementDialog settlement={undoing} onClose={() => setUndoing(null)} onDone={refreshAll} />
    </div>
  );
}
