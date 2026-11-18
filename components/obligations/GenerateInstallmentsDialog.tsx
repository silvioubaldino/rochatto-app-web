"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { api, APIError } from "@/lib/api";
import { formatMoeda } from "@/lib/formatters";
import {
  generateInstallmentsSchema,
  toGenerateInstallmentsPayload,
  type GenerateInstallmentsFormData,
  type GenerateInstallmentsFormInput,
} from "@/lib/schemas";
import type { Obligation } from "@/lib/types";
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
import { FieldError } from "./shared";

interface GenerateInstallmentsDialogProps {
  open: boolean;
  onClose: () => void;
  obligation: Pick<Obligation, "id" | "open">;
  onDone: () => void;
}

/** Gera parcelas iguais (centavos na última — calculado pela API): `.../installments/generate`. */
export function GenerateInstallmentsDialog({ open, onClose, obligation, onDone }: GenerateInstallmentsDialogProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GenerateInstallmentsFormInput, unknown, GenerateInstallmentsFormData>({
    resolver: zodResolver(generateInstallmentsSchema),
  });

  useEffect(() => {
    if (open) reset({ count: "2", first_due_date: "", interval_months: "", amount: 0 });
  }, [open, reset]);

  async function onSubmit(data: GenerateInstallmentsFormData) {
    try {
      await api.post(`/obligations/${obligation.id}/installments/generate`, toGenerateInstallmentsPayload(data));
      toast.success("Parcelas geradas.");
      onDone();
      onClose();
    } catch (err) {
      toast.error(err instanceof APIError ? err.message : "Erro ao gerar parcelas.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gerar parcelas</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Substitui o plano atual por parcelas iguais. Em aberto: <strong>{formatMoeda(obligation.open)}</strong>
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="gi-count">Parcelas (2 a 24) *</Label>
              <Input id="gi-count" inputMode="numeric" {...register("count")} aria-invalid={!!errors.count} />
              <FieldError message={errors.count?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gi-first">Primeiro vencimento *</Label>
              <Input id="gi-first" type="date" {...register("first_due_date")} aria-invalid={!!errors.first_due_date} />
              <FieldError message={errors.first_due_date?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gi-interval">Intervalo em meses</Label>
              <Input
                id="gi-interval"
                inputMode="numeric"
                placeholder="1"
                {...register("interval_months")}
                aria-invalid={!!errors.interval_months}
              />
              <FieldError message={errors.interval_months?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gi-amount">Valor a parcelar</Label>
              <Controller
                control={control}
                name="amount"
                render={({ field }) => (
                  <MoneyInput id="gi-amount" value={field.value ?? 0} onChange={field.onChange} />
                )}
              />
              <p className="text-xs text-muted-foreground">Vazio = o que está em aberto.</p>
              <FieldError message={errors.amount?.message} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Gerar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
