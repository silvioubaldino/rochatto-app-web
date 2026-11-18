"use client";

import { useEffect } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { api, APIError } from "@/lib/api";
import { formatMoeda } from "@/lib/formatters";
import { sumMoney, validateInstallmentsTotal } from "@/lib/obligations";
import {
  installmentsSchema,
  toInstallmentsPayload,
  type InstallmentsFormData,
  type InstallmentsFormInput,
} from "@/lib/schemas";
import type { Installment, Obligation } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { FieldError, PaymentMethodOptions, SELECT_CLASS } from "./shared";

interface InstallmentsEditorProps {
  open: boolean;
  onClose: () => void;
  obligation: Pick<Obligation, "id" | "amount">;
  installments: Installment[];
  onDone: () => void;
}

/** Edita o plano inteiro de parcelas: `PUT /obligations/{id}/installments` (Σ ≤ valor da conta). */
export function InstallmentsEditor({ open, onClose, obligation, installments, onDone }: InstallmentsEditorProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InstallmentsFormInput, unknown, InstallmentsFormData>({
    resolver: zodResolver(installmentsSchema),
  });
  const { fields, append, remove } = useFieldArray({ control, name: "installments" });
  const rows = useWatch({ control, name: "installments" });
  const amounts = (rows ?? []).map((r) => Number(r?.amount) || 0);
  const total = sumMoney(amounts);
  const totalError = validateInstallmentsTotal(amounts, obligation.amount);

  useEffect(() => {
    if (open) {
      reset({
        installments: installments.map((i) => ({
          due_date: i.due_date.slice(0, 10),
          amount: i.amount,
          payment_method: i.payment_method ?? "",
          notes: i.notes ?? "",
        })),
      });
    }
  }, [open, installments, reset]);

  async function onSubmit(data: InstallmentsFormData) {
    if (validateInstallmentsTotal(data.installments.map((i) => i.amount), obligation.amount)) return;
    try {
      await api.put(`/obligations/${obligation.id}/installments`, toInstallmentsPayload(data));
      toast.success("Parcelas salvas.");
      onDone();
      onClose();
    } catch (err) {
      toast.error(err instanceof APIError ? err.message : "Erro ao salvar parcelas.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Parcelas</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {fields.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Sem parcelas. Salvar assim remove o plano.
              </p>
            )}
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-2 items-start gap-2 rounded-md border p-2 sm:grid-cols-[9rem_9rem_9rem_1fr_auto]">
                <div className="space-y-1">
                  <Input type="date" {...register(`installments.${index}.due_date`)} aria-label="Vencimento" />
                  <FieldError message={errors.installments?.[index]?.due_date?.message} />
                </div>
                <div className="space-y-1">
                  <Controller
                    control={control}
                    name={`installments.${index}.amount`}
                    render={({ field: f }) => <MoneyInput value={f.value ?? 0} onChange={f.onChange} />}
                  />
                  <FieldError message={errors.installments?.[index]?.amount?.message} />
                </div>
                <select
                  {...register(`installments.${index}.payment_method`)}
                  className={SELECT_CLASS}
                  aria-label="Forma de pagamento"
                >
                  <PaymentMethodOptions placeholder="Forma (opcional)" />
                </select>
                <Input placeholder="Observações" {...register(`installments.${index}.notes`)} />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => remove(index)}
                  title="Remover parcela"
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ due_date: "", amount: 0, payment_method: "", notes: "" })}
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar parcela
            </Button>
            <p className="text-sm">
              Soma: <strong>{formatMoeda(total)}</strong> de {formatMoeda(obligation.amount)}
            </p>
          </div>
          {totalError && <p role="alert" className="text-sm text-destructive">{totalError}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !!totalError}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
