"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EntityCombobox } from "@/components/entity/EntityCombobox";
import { DateField, FieldShell, MoneyField, QuantityField } from "@/components/patterns/fields";
import { ResponsiveDialog } from "@/components/patterns/ResponsiveDialog";
import { Select } from "@/components/patterns/Select";
import { STOCK_ADJUSTMENT_REASONS, STOCK_ADJUSTMENT_REASON_LABELS, todayISO } from "@/lib/format";
import { errorMessage } from "@/lib/errors";
import { ADJUSTMENT_DIRECTIONS, adjustmentSchema, type AdjustmentFormData } from "../model";
import { useCreateAdjustment } from "../mutations";

const FORM_ID = "adjustment-form";
const REASONS = STOCK_ADJUSTMENT_REASONS.map((r) => ({ value: r, label: STOCK_ADJUSTMENT_REASON_LABELS[r] }));

export function AdjustmentDialog({ productId, onClose }: { productId?: string; onClose: () => void }) {
  const create = useCreateAdjustment();
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdjustmentFormData>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: { product_id: productId ?? "", direction: "IN", quantity: 0, unit_cost: 0, reason: "COUNT", adjusted_at: todayISO(), notes: "" },
  });

  async function onSubmit(data: AdjustmentFormData) {
    if ((await create.mutate(data)) !== undefined) onClose();
  }

  return (
    <ResponsiveDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Novo ajuste de estoque"
      size="sm"
      description="O ajuste é imutável: um erro se corrige com outro ajuste."
      dismissible={!create.pending}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={create.pending}>Cancelar</Button>
          <Button type="submit" form={FORM_ID} disabled={create.pending}>
            {create.pending && <Loader2 className="animate-spin" aria-hidden />}
            Registrar ajuste
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {create.error != null && <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">{errorMessage(create.error, "Erro ao registrar o ajuste.")}</p>}
        <FieldShell label="Produto" htmlFor="adj-product" required error={errors.product_id?.message}>
          <Controller control={control} name="product_id" render={({ field }) => <EntityCombobox kind="product" id="adj-product" value={field.value} onChange={(id) => field.onChange(id)} invalid={!!errors.product_id} allowCreate={false} />} />
        </FieldShell>
        <div className="grid grid-cols-2 gap-3">
          <FieldShell label="Ajuste" htmlFor="adj-direction" required>
            <Controller control={control} name="direction" render={({ field }) => <Select id="adj-direction" value={field.value} onChange={(v) => field.onChange(v)} options={ADJUSTMENT_DIRECTIONS} />} />
          </FieldShell>
          <FieldShell label="Quantidade" htmlFor="adj-qty" required error={errors.quantity?.message}>
            <Controller control={control} name="quantity" render={({ field }) => <QuantityField id="adj-qty" value={field.value} onChange={field.onChange} invalid={!!errors.quantity} />} />
          </FieldShell>
        </div>
        <FieldShell label="Custo unitário" htmlFor="adj-cost" hint="Opcional. Vazio ou zero = sem custo informado." error={errors.unit_cost?.message}>
          <Controller control={control} name="unit_cost" render={({ field }) => <MoneyField id="adj-cost" value={field.value} onChange={field.onChange} />} />
        </FieldShell>
        <div className="grid grid-cols-2 gap-3">
          <FieldShell label="Motivo" htmlFor="adj-reason" required error={errors.reason?.message}>
            <Controller control={control} name="reason" render={({ field }) => <Select id="adj-reason" value={field.value} onChange={(v) => field.onChange(v)} options={REASONS} />} />
          </FieldShell>
          <FieldShell label="Data" htmlFor="adj-date" required error={errors.adjusted_at?.message}>
            <Controller control={control} name="adjusted_at" render={({ field }) => <DateField id="adj-date" shortcuts={false} value={field.value} onChange={field.onChange} />} />
          </FieldShell>
        </div>
        <FieldShell label="Observações" htmlFor="adj-notes"><Textarea id="adj-notes" {...register("notes")} /></FieldShell>
      </form>
    </ResponsiveDialog>
  );
}
