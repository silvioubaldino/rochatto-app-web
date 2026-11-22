"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DateField, FieldShell, MoneyField } from "@/components/patterns/fields";
import { useUndoToast } from "@/components/patterns/ConfirmDialog";
import { ResponsiveDialog } from "@/components/patterns/ResponsiveDialog";
import { Select } from "@/components/patterns/Select";
import { MOVEMENT_CATEGORY_LABELS, PAYMENT_METHODS, PAYMENT_METHOD_LABELS, todayISO } from "@/lib/format";
import { errorMessage } from "@/lib/errors";
import type { FinancialMovement } from "@/lib/types";
import { movementCategories, movementKindOf, movementSchema, type MovementFormData, type MovementKind } from "../model";
import { useSaveMovement, useVoidMovement } from "../mutations";

const FORM_ID = "movement-form";
const METHOD_OPTIONS = [{ value: "", label: "Não informado" }, ...PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABELS[m] }))];

const COPY: Record<MovementKind, { create: string; hint: string; done: string; counterparty: string }> = {
  EXPENSE: { create: "Nova despesa", hint: "Saída que não quita nenhuma conta: combustível, manutenção, impostos do mês…", done: "Despesa lançada.", counterparty: "Para quem" },
  INCOME: { create: "Nova receita avulsa", hint: "Entrada que não vem de uma venda.", done: "Receita lançada.", counterparty: "De quem" },
};

/** Despesa ou receita avulsa (criar) e correção de uma movimentação. O valor é digitado sem sinal; a categoria dá o sinal. */
export function MovementDialog({ kind, movement, onClose }: { kind: MovementKind; movement?: FinancialMovement; onClose: () => void }) {
  const save = useSaveMovement(movement);
  const voidMovement = useVoidMovement();
  const undoable = useUndoToast();
  const effectiveKind = movement ? movementKindOf(movement) : kind;
  const categories = movementCategories(effectiveKind, movement?.category);
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MovementFormData>({
    resolver: zodResolver(movementSchema),
    defaultValues: movement
      ? { category: movement.category, amount: Math.abs(movement.amount), occurred_on: movement.occurred_on.slice(0, 10), payment_method: movement.payment_method ?? "", counterparty_name: movement.counterparty_name ?? "", description: movement.description ?? "" }
      : { category: "", amount: 0, occurred_on: todayISO(), payment_method: "", counterparty_name: "", description: "" },
  });

  async function onSubmit(data: MovementFormData) {
    const saved = await save.mutate(data);
    if (!saved) return;
    if (movement) {
      // corrigir é uma ação direta; criar oferece desfazer (anular)
      onClose();
      return;
    }
    undoable(COPY[kind].done, () => voidMovement.mutate(saved.id));
    onClose();
  }

  return (
    <ResponsiveDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={movement ? "Corrigir movimentação" : COPY[kind].create}
      description={movement ? undefined : COPY[kind].hint}
      size="sm"
      dismissible={!save.pending}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={save.pending}>Cancelar</Button>
          <Button type="submit" form={FORM_ID} disabled={save.pending}>
            {save.pending && <Loader2 className="animate-spin" aria-hidden />}
            {movement ? "Salvar correção" : "Lançar"}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {save.error != null && <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">{errorMessage(save.error, "Erro ao salvar a movimentação.")}</p>}
        <FieldShell label="Categoria" htmlFor="mv-category" required error={errors.category?.message}>
          <Controller control={control} name="category" render={({ field }) => <Select id="mv-category" value={field.value} onChange={(v) => field.onChange(v)} options={categories.map((c) => ({ value: c, label: MOVEMENT_CATEGORY_LABELS[c] }))} placeholder="Selecione…" invalid={!!errors.category} />} />
        </FieldShell>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FieldShell label="Valor" htmlFor="mv-amount" required error={errors.amount?.message}>
            <Controller control={control} name="amount" render={({ field }) => <MoneyField id="mv-amount" value={field.value} onChange={field.onChange} invalid={!!errors.amount} />} />
          </FieldShell>
          <FieldShell label="Data" htmlFor="mv-date" required error={errors.occurred_on?.message}>
            <Controller control={control} name="occurred_on" render={({ field }) => <DateField id="mv-date" shortcuts={false} value={field.value} onChange={field.onChange} invalid={!!errors.occurred_on} />} />
          </FieldShell>
        </div>
        <FieldShell label="Forma de pagamento" htmlFor="mv-method">
          <Controller control={control} name="payment_method" render={({ field }) => <Select id="mv-method" value={field.value} onChange={(v) => field.onChange(v)} options={METHOD_OPTIONS} />} />
        </FieldShell>
        <FieldShell label={COPY[effectiveKind].counterparty} htmlFor="mv-party"><Input id="mv-party" autoComplete="off" {...register("counterparty_name")} /></FieldShell>
        <FieldShell label="Descrição" htmlFor="mv-desc"><Textarea id="mv-desc" {...register("description")} /></FieldShell>
      </form>
    </ResponsiveDialog>
  );
}
