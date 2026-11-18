"use client";

import { useState } from "react";
import Link from "next/link";
import { useSWRConfig } from "swr";
import { CalendarPlus, Wallet } from "lucide-react";
import { isAccountingKey, useObligation, useOriginObligations } from "@/hooks/useObligations";
import { DIRECTION_LABELS, formatCounterparty, formatMoeda } from "@/lib/formatters";
import type { Obligation } from "@/lib/types";
import { ObligationStatusBadge, OverdueBadge } from "@/components/status-badges";
import { GenerateInstallmentsDialog } from "./GenerateInstallmentsDialog";
import { InstallmentsList } from "./InstallmentsList";
import { SettleDialog } from "./SettleDialog";
import { SettlementsList } from "./SettlementsList";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function ObligationBlock({
  summary,
  detailed,
  readOnly,
  onChanged,
}: {
  summary: Obligation;
  /** Mostra parcelas e quitações (a conta RECEIVABLE da Sale). */
  detailed: boolean;
  readOnly: boolean;
  onChanged: () => void;
}) {
  const { mutate } = useSWRConfig();
  const { obligation: detail, refresh } = useObligation(detailed ? summary.id : "");
  const [settleOpen, setSettleOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const o = detail ?? summary;
  const receiving = o.direction === "RECEIVABLE";

  function done() {
    refresh();
    mutate(isAccountingKey);
    onChanged();
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">
          {receiving ? "A receber de " : "A pagar a "}
          {formatCounterparty(o.counterparty)}
        </span>
        <ObligationStatusBadge status={o.status} />
        {o.overdue && <OverdueBadge />}
        <Link href={`/contas/${o.id}`} className="ml-auto text-xs text-primary hover:underline">
          Ver conta
        </Link>
      </div>
      <dl className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Valor</dt>
          <dd className="font-semibold tabular-nums">{formatMoeda(o.amount)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{receiving ? "Recebido" : "Pago"}</dt>
          <dd className="tabular-nums text-green-600">{formatMoeda(o.settled)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Em aberto</dt>
          <dd className="font-semibold tabular-nums text-orange-600">{formatMoeda(o.open)}</dd>
        </div>
      </dl>

      {detailed && detail && (
        <>
          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Parcelas</h3>
            <InstallmentsList installments={detail.installments ?? []} />
          </div>
          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Quitações</h3>
            <SettlementsList settlements={detail.settlements ?? []} />
          </div>
        </>
      )}

      {!readOnly && (
        <div className="flex flex-wrap gap-2">
          {o.open > 0 && (
            <Button size="sm" onClick={() => setSettleOpen(true)}>
              <Wallet className="h-3.5 w-3.5" />
              {receiving ? "Receber" : "Pagar"}
            </Button>
          )}
          {detailed && (
            <Button size="sm" variant="outline" onClick={() => setGenerateOpen(true)}>
              <CalendarPlus className="h-3.5 w-3.5" />
              Parcelar
            </Button>
          )}
        </div>
      )}

      <SettleDialog open={settleOpen} onClose={() => setSettleOpen(false)} obligation={o} onDone={done} />
      {detailed && (
        <GenerateInstallmentsDialog
          open={generateOpen}
          onClose={() => setGenerateOpen(false)}
          obligation={o}
          onDone={done}
        />
      )}
    </div>
  );
}

interface OriginObligationsProps {
  originType: "SALE" | "PURCHASE";
  originId: string;
  title: string;
  /** Qual direção mostrar com parcelas e quitações em linha (a da Sale: RECEIVABLE). */
  detailedDirection?: "RECEIVABLE" | "PAYABLE";
  /** Sale cancelada: contas somente leitura (a API bloqueia com 409). */
  readOnly?: boolean;
  onChanged?: () => void;
}

/** Contas (Obligations) de uma Sale ou Purchase, com Pagar/Receber e link ao detalhe. */
export function OriginObligations({
  originType,
  originId,
  title,
  detailedDirection,
  readOnly = false,
  onChanged,
}: OriginObligationsProps) {
  const { obligations, isLoading, error, refresh } = useOriginObligations(originType, originId);

  return (
    <Card className="space-y-3 p-4">
      <h2 className="text-sm font-semibold uppercase text-muted-foreground">{title}</h2>
      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : error ? (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "Erro ao carregar as contas."}
        </p>
      ) : obligations.length === 0 ? (
        <p className="py-3 text-center text-sm text-muted-foreground">Nenhuma conta nesta origem.</p>
      ) : (
        <div className="space-y-3">
          {obligations.map((o) => (
            <div key={o.id}>
              <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                {DIRECTION_LABELS[o.direction]}
              </p>
              <ObligationBlock
                summary={o}
                detailed={detailedDirection === o.direction}
                readOnly={readOnly}
                onChanged={() => {
                  refresh();
                  onChanged?.();
                }}
              />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
