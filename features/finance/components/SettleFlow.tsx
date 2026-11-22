"use client";

import { useMemo } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DateField, FieldShell, MoneyField } from "@/components/patterns/fields";
import { useUndoToast } from "@/components/patterns/ConfirmDialog";
import { ResponsiveDialog } from "@/components/patterns/ResponsiveDialog";
import { Select } from "@/components/patterns/Select";
import { MoneyText } from "@/components/patterns/values";
import type { SettleFlowProps } from "@/components/entity/settle-flow";
import { OBLIGATION_WARNING_MESSAGES, PAYMENT_METHODS, PAYMENT_METHOD_LABELS, formatCounterparty, formatMoney, todayISO } from "@/lib/format";
import { errorMessage } from "@/lib/errors";
import type { Obligation } from "@/lib/types";
import {
  obligationVerb,
  settleBlocker,
  settleDefaults,
  settleMixedCounterparties,
  settleSchema,
  settleTitle,
  settleTotal,
  settledMessage,
  type SettleFormData,
  type SettleFormValues,
} from "../model";
import { useSettle, useVoidMovement } from "../mutations";
import { useObligationsByIds } from "../queries";

const FORM_ID = "settle-flow-form";
const METHOD_OPTIONS = PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABELS[m] }));

/**
 * Pagar/Receber 1..N contas (UX-P09): valor por conta editável, data, forma. Uma movimentação quita todas
 * (um Pix pode quitar várias contas). Concluído, oferece "Desfazer" (anula a movimentação) por 8 s.
 */
export function SettleFlow({ obligations, obligationIds, onClose }: SettleFlowProps) {
  const loaded = useObligationsByIds(obligations ? undefined : obligationIds);
  const list = obligations ?? loaded.obligations;
  if (!list) {
    return (
      <ResponsiveDialog open onOpenChange={(o) => !o && onClose()} title="Carregando conta…" size="md">
        <p role="status" className="py-6 text-center text-sm text-muted-foreground">
          {loaded.error ? errorMessage(loaded.error, "Não foi possível carregar a conta.") : "Carregando…"}
        </p>
      </ResponsiveDialog>
    );
  }
  return <SettleForm obligations={list.filter((o) => o.open > 0)} onClose={onClose} />;
}

function SettleForm({ obligations, onClose }: { obligations: readonly Obligation[]; onClose: () => void }) {
  const settle = useSettle();
  const voidMovement = useVoidMovement();
  const undoable = useUndoToast();
  const blocker = settleBlocker(obligations);
  const direction = obligations[0]?.direction ?? "PAYABLE";
  const verb = obligationVerb(direction);
  const byId = useMemo(() => new Map(obligations.map((o) => [o.id, o])), [obligations]);
  const mixed = settleMixedCounterparties(obligations);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SettleFormValues, unknown, SettleFormData>({ resolver: zodResolver(settleSchema), defaultValues: settleDefaults(obligations, todayISO()) });
  const { fields } = useFieldArray({ control, name: "allocations" });
  const allocations = useWatch({ control, name: "allocations" });
  const total = settleTotal(allocations ?? []);

  async function onSubmit(data: SettleFormData) {
    const res = await settle.mutate(data);
    if (!res) return;
    for (const w of res.warnings ?? []) toast.warning(OBLIGATION_WARNING_MESSAGES[w] ?? w);
    undoable(settledMessage(direction, settleTotal(data.allocations), data.allocations.length), () => voidMovement.mutate(res.movement.id));
    onClose();
  }

  return (
    <ResponsiveDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={settleTitle(obligations)}
      size="md"
      dismissible={!settle.pending}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={settle.pending}>Cancelar</Button>
          <Button type="submit" form={FORM_ID} disabled={settle.pending || !!blocker}>
            {settle.pending && <Loader2 className="animate-spin" aria-hidden />}
            {verb} {formatMoney(total)}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {(blocker || settle.error != null) && (
          <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">{blocker ?? errorMessage(settle.error, "Não foi possível registrar.")}</p>
        )}
        {mixed && (
          <p role="note" className="flex items-start gap-2 rounded-md bg-warning-subtle px-3 py-2 text-sm text-warning">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {OBLIGATION_WARNING_MESSAGES.MIXED_COUNTERPARTIES}
          </p>
        )}

        <ul aria-label="Contas" className="space-y-3">
          {fields.map((field, index) => {
            const o = byId.get(field.obligation_id);
            return (
              <li key={field.id} className="grid grid-cols-1 gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_11rem] sm:items-end">
                <div className="min-w-0 text-sm">
                  <p className="truncate font-medium">{formatCounterparty(o?.counterparty)}</p>
                  <p className="truncate text-muted-foreground">{o?.origin.label} · em aberto <MoneyText value={o?.open ?? 0} /></p>
                </div>
                <FieldShell label={`Valor — ${formatCounterparty(o?.counterparty)}`} htmlFor={`settle-amount-${index}`} error={errors.allocations?.[index]?.amount?.message}>
                  <Controller control={control} name={`allocations.${index}.amount`} render={({ field: f }) => <MoneyField id={`settle-amount-${index}`} value={f.value} onChange={f.onChange} invalid={!!errors.allocations?.[index]?.amount} />} />
                </FieldShell>
              </li>
            );
          })}
        </ul>
        {fields.length > 1 && <p className="text-right text-sm">Total <strong>{formatMoney(total)}</strong></p>}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FieldShell label="Data" htmlFor="settle-date" required error={errors.occurred_on?.message}>
            <Controller control={control} name="occurred_on" render={({ field }) => <DateField id="settle-date" shortcuts={false} value={field.value} onChange={field.onChange} invalid={!!errors.occurred_on} />} />
          </FieldShell>
          <FieldShell label="Forma de pagamento" htmlFor="settle-method" required error={errors.payment_method?.message}>
            <Controller control={control} name="payment_method" render={({ field }) => <Select id="settle-method" value={field.value} onChange={(v) => field.onChange(v)} options={METHOD_OPTIONS} placeholder="Selecione…" invalid={!!errors.payment_method} />} />
          </FieldShell>
        </div>
      </form>
    </ResponsiveDialog>
  );
}

