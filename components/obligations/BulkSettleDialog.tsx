"use client";

import { useEffect } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import {
  DIRECTION_LABELS,
  OBLIGATION_WARNING_MESSAGES,
  formatCounterparty,
  formatMoeda,
  todayISO,
} from "@/lib/formatters";
import { defaultAllocations, hasMixedCounterparties, sumMoney } from "@/lib/obligations";
import {
  bulkSettleSchema,
  toBulkSettlePayload,
  type BulkSettleFormData,
  type BulkSettleFormInput,
} from "@/lib/schemas";
import type { Obligation, SettlementResponse } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { FieldError, PaymentMethodOptions, SELECT_CLASS, conflictOrToast, notifyWarnings } from "./shared";

interface BulkSettleDialogProps {
  open: boolean;
  onClose: () => void;
  /** Contas selecionadas (todas da mesma direção). */
  obligations: Obligation[];
  onDone: () => void;
}

/** Pagar/receber várias contas com uma movimentação: `POST /settlements`. */
export function BulkSettleDialog({ open, onClose, obligations, onDone }: BulkSettleDialogProps) {
  const receiving = obligations[0]?.direction === "RECEIVABLE";
  const mixed = hasMixedCounterparties(obligations);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<BulkSettleFormInput, unknown, BulkSettleFormData>({
    resolver: zodResolver(bulkSettleSchema),
  });
  const { fields } = useFieldArray({ control, name: "allocations" });
  const allocations = useWatch({ control, name: "allocations" });
  const total = sumMoney((allocations ?? []).map((a) => Number(a?.amount) || 0));

  useEffect(() => {
    if (open) {
      reset({
        occurred_on: todayISO(),
        payment_method: "",
        allocations: defaultAllocations(obligations),
      });
    }
  }, [open, obligations, reset]);

  async function onSubmit(data: BulkSettleFormData) {
    clearErrors("root.server");
    try {
      const res = await api.post<SettlementResponse>("/settlements", toBulkSettlePayload(data));
      toast.success(receiving ? "Recebimento registrado." : "Pagamento registrado.");
      notifyWarnings(res?.warnings);
      onDone();
      onClose();
    } catch (err) {
      const conflict = conflictOrToast(err, "Erro ao registrar a quitação.");
      if (conflict) setError("root.server", { message: conflict });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {receiving ? "Receber várias contas" : "Pagar várias contas"}
            {obligations[0] && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({DIRECTION_LABELS[obligations[0].direction]})
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {mixed && (
            <div className="flex items-start gap-2 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{OBLIGATION_WARNING_MESSAGES.MIXED_COUNTERPARTIES}</span>
            </div>
          )}

          <div className="max-h-64 space-y-2 overflow-y-auto">
            {fields.map((field, index) => {
              const o = obligations.find((x) => x.id === field.obligation_id);
              return (
                <div key={field.id} className="flex items-center gap-3 rounded-md border p-2">
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="truncate font-medium">{formatCounterparty(o?.counterparty)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {o?.origin.label} · em aberto {formatMoeda(o?.open ?? 0)}
                    </p>
                  </div>
                  <div className="w-36 space-y-1">
                    <Controller
                      control={control}
                      name={`allocations.${index}.amount`}
                      render={({ field: f }) => (
                        <MoneyInput value={f.value ?? 0} onChange={f.onChange} className="h-8" />
                      )}
                    />
                    <FieldError message={errors.allocations?.[index]?.amount?.message} />
                  </div>
                </div>
              );
            })}
          </div>
          <FieldError message={errors.allocations?.message} />

          <p className="text-right text-sm">
            Total: <strong>{formatMoeda(total)}</strong>
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bs-date">Data *</Label>
              <Input id="bs-date" type="date" {...register("occurred_on")} aria-invalid={!!errors.occurred_on} />
              <FieldError message={errors.occurred_on?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bs-method">Forma de pagamento *</Label>
              <select id="bs-method" {...register("payment_method")} className={SELECT_CLASS}>
                <PaymentMethodOptions placeholder="Selecione..." />
              </select>
              <FieldError message={errors.payment_method?.message} />
            </div>
          </div>

          {errors.root?.server?.message && (
            <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-sm text-destructive">
              {errors.root.server.message}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || obligations.length === 0}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {receiving ? "Receber" : "Pagar"} {formatMoeda(total)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
