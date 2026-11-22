"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InstallmentPlanEditor, initialPlanState, planFromInstallments, resolvePlan, validatePlan, type PlanState } from "@/components/entity/installment-plan";
import { ResponsiveDialog } from "@/components/patterns/ResponsiveDialog";
import { todayISO } from "@/lib/format";
import { isApiError } from "@/lib/errors";
import type { Obligation } from "@/lib/types";
import { useSetInstallments } from "../mutations";

export function PlanDialog({ obligation, onClose }: { obligation: Obligation; onClose: () => void }) {
  const today = todayISO();
  const existing = obligation.installments ?? [];
  const [plan, setPlan] = useState<PlanState>(() => (existing.length > 0 ? planFromInstallments(existing, today) : initialPlanState(today, "equal")));
  const [localError, setLocalError] = useState<string | null>(null);
  const save = useSetInstallments();
  const lines = resolvePlan(plan, obligation.amount, today);
  const serverError = isApiError(save.error) ? save.error.message : null;

  async function onSave() {
    const error = validatePlan(lines, obligation.amount);
    setLocalError(error);
    if (error) return;
    if (await save.mutate(obligation.id, lines)) onClose();
  }

  return (
    <ResponsiveDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={existing.length > 0 ? "Editar parcelas" : "Definir parcelas"}
      description="A parcela é plano, não dinheiro: o que foi quitado cobre as parcelas por ordem de vencimento."
      size="lg"
      dismissible={!save.pending}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={save.pending}>Voltar</Button>
          <Button type="button" onClick={onSave} disabled={save.pending}>
            {save.pending && <Loader2 className="animate-spin" aria-hidden />}
            Salvar parcelas
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {(localError || serverError) && <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">{localError ?? serverError}</p>}
        <InstallmentPlanEditor idPrefix="obligation-plan" total={obligation.amount} today={today} value={plan} onChange={(p) => { setLocalError(null); setPlan(p); }} />
      </div>
    </ResponsiveDialog>
  );
}
