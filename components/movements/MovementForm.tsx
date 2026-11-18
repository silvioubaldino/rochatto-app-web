"use client";

import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  MOVEMENT_CATEGORY_LABELS,
  todayISO,
} from "@/lib/formatters";
import { movementSchema, toMovementPayload, type MovementFormData, type MovementFormInput } from "@/lib/schemas";
import type { FinancialMovement, MovementCategory } from "@/lib/types";
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
import { Textarea } from "@/components/ui/textarea";
import { FieldError, PaymentMethodOptions, SELECT_CLASS, conflictOrToast } from "@/components/obligations/shared";

interface MovementFormProps {
  open: boolean;
  onClose: () => void;
  /** Com `movement` é uma correção (PUT); sem, um lançamento avulso (POST). */
  movement?: FinancialMovement;
  onDone: () => void;
}

/** Despesa (saída sem quitação) ou OTHER_INCOME; o sinal vem da categoria. */
export function MovementForm({ open, onClose, movement, onDone }: MovementFormProps) {
  const isEdit = !!movement;

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<MovementFormInput, unknown, MovementFormData>({ resolver: zodResolver(movementSchema) });

  // Na criação só as categorias avulsas; na correção, também a categoria atual (ex.: SALE_RECEIPT).
  const categories = useMemo<MovementCategory[]>(() => {
    const base = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];
    return movement && !base.includes(movement.category) ? [movement.category, ...base] : base;
  }, [movement]);

  useEffect(() => {
    if (!open) return;
    reset(
      movement
        ? {
            category: movement.category,
            amount: Math.abs(movement.amount),
            occurred_on: movement.occurred_on.slice(0, 10),
            payment_method: movement.payment_method ?? "",
            counterparty_name: movement.counterparty_name ?? "",
            description: movement.description ?? "",
          }
        : {
            category: "",
            amount: 0,
            occurred_on: todayISO(),
            payment_method: "",
            counterparty_name: "",
            description: "",
          },
    );
  }, [open, movement, reset]);

  async function onSubmit(data: MovementFormData) {
    clearErrors("root.server");
    try {
      const payload = toMovementPayload(data);
      if (movement) {
        await api.put(`/financial-movements/${movement.id}`, payload);
        toast.success("Movimentação corrigida.");
      } else {
        await api.post("/financial-movements", payload);
        toast.success("Movimentação lançada.");
      }
      onDone();
      onClose();
    } catch (err) {
      // 409 (Σ quitações > |valor| ou inversão de sinal) fica no formulário
      const conflict = conflictOrToast(err, "Erro ao salvar a movimentação.");
      if (conflict) setError("root.server", { message: conflict });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Corrigir movimentação" : "Nova movimentação"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mv-category">Categoria *</Label>
            <select id="mv-category" {...register("category")} className={SELECT_CLASS}>
              <option value="">Selecione...</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {MOVEMENT_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
            <FieldError message={errors.category?.message} />
            <p className="text-xs text-muted-foreground">
              Receita avulsa entra (+); as demais categorias são despesas e saem (−).
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="mv-amount">Valor *</Label>
              <Controller
                control={control}
                name="amount"
                render={({ field }) => <MoneyInput id="mv-amount" value={field.value ?? 0} onChange={field.onChange} />}
              />
              <FieldError message={errors.amount?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mv-date">Data *</Label>
              <Input id="mv-date" type="date" {...register("occurred_on")} aria-invalid={!!errors.occurred_on} />
              <FieldError message={errors.occurred_on?.message} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mv-method">Forma de pagamento</Label>
            <select id="mv-method" {...register("payment_method")} className={SELECT_CLASS}>
              <PaymentMethodOptions placeholder="Não informado" />
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mv-party">Contraparte</Label>
            <Input id="mv-party" {...register("counterparty_name")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mv-desc">Descrição</Label>
            <Textarea id="mv-desc" {...register("description")} />
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
              {isEdit ? "Salvar correção" : "Lançar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
