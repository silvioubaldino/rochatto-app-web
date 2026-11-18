"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { formatCounterparty, formatMoeda, todayISO } from "@/lib/formatters";
import {
  settleSchema,
  toSettlePayload,
  type SettleFormData,
  type SettleFormInput,
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

interface SettleDialogProps {
  open: boolean;
  onClose: () => void;
  obligation: Pick<Obligation, "id" | "direction" | "open" | "counterparty">;
  onDone: () => void;
}

/** Pagar (PAYABLE) ou Receber (RECEIVABLE) uma conta: `POST /obligations/{id}/settle`. */
export function SettleDialog({ open, onClose, obligation, onDone }: SettleDialogProps) {
  const receiving = obligation.direction === "RECEIVABLE";
  const verb = receiving ? "Receber" : "Pagar";

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<SettleFormInput, unknown, SettleFormData>({ resolver: zodResolver(settleSchema) });

  useEffect(() => {
    if (open) {
      reset({ amount: obligation.open, occurred_on: todayISO(), payment_method: "" });
    }
  }, [open, obligation.open, reset]);

  async function onSubmit(data: SettleFormData) {
    clearErrors("root.server");
    try {
      const res = await api.post<SettlementResponse>(
        `/obligations/${obligation.id}/settle`,
        toSettlePayload(data),
      );
      toast.success(receiving ? "Recebimento registrado." : "Pagamento registrado.");
      notifyWarnings(res?.warnings);
      onDone();
      onClose();
    } catch (err) {
      const conflict = conflictOrToast(err, `Erro ao registrar ${receiving ? "recebimento" : "pagamento"}.`);
      if (conflict) setError("root.server", { message: conflict });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {verb} — {formatCounterparty(obligation.counterparty)}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Em aberto: <strong>{formatMoeda(obligation.open)}</strong>
          </p>
          <div className="space-y-2">
            <Label htmlFor="st-amount">Valor *</Label>
            <Controller
              control={control}
              name="amount"
              render={({ field }) => (
                <MoneyInput id="st-amount" value={field.value ?? 0} onChange={field.onChange} />
              )}
            />
            <FieldError message={errors.amount?.message} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="st-date">Data *</Label>
              <Input id="st-date" type="date" {...register("occurred_on")} aria-invalid={!!errors.occurred_on} />
              <FieldError message={errors.occurred_on?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="st-method">Forma de pagamento *</Label>
              <select id="st-method" {...register("payment_method")} className={SELECT_CLASS}>
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {verb}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
