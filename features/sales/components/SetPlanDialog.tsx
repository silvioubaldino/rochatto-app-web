"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InstallmentPlanEditor, initialPlanState, resolvePlan, validatePlan, type PlanState } from "@/components/entity/installment-plan";
import { ResponsiveDialog } from "@/components/patterns/ResponsiveDialog";
import { todayISO } from "@/lib/format";
import { isApiError } from "@/lib/errors";
import { useSetInstallments } from "../mutations";

export function SetPlanDialog({
  open,
  onOpenChange,
  obligationId,
  total,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  obligationId: string;
  total: number;
}) {
  return open ? <Form onOpenChange={onOpenChange} obligationId={obligationId} total={total} /> : null;
}

function Form({ onOpenChange, obligationId, total }: Omit<Parameters<typeof SetPlanDialog>[0], "open">) {
  const today = todayISO();
  const [plan, setPlan] = useState<PlanState>(() => initialPlanState(today));
  const [localError, setLocalError] = useState<string | null>(null);
  const save = useSetInstallments();
  const lines = resolvePlan(plan, total, today);
  const serverError = isApiError(save.error) ? save.error.message : null;

  async function onSave() {
    const error = validatePlan(lines, total) ?? (lines.length === 0 ? "Escolha uma forma de recebimento com parcelas." : null);
    setLocalError(error);
    if (error) return;
    if (await save.mutate(obligationId, lines)) onOpenChange(false);
  }

  return (
    <ResponsiveDialog
      open
      onOpenChange={onOpenChange}
      title="Definir recebimento"
      size="lg"
      dismissible={!save.pending}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={save.pending}>Voltar</Button>
          <Button type="button" onClick={onSave} disabled={save.pending}>
            {save.pending && <Loader2 className="animate-spin" aria-hidden />}
            Salvar plano
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {(localError || serverError) && <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">{localError ?? serverError}</p>}
        <InstallmentPlanEditor idPrefix="sale-plan" total={total} today={today} value={plan} onChange={(p) => { setLocalError(null); setPlan(p); }} />
      </div>
    </ResponsiveDialog>
  );
}
