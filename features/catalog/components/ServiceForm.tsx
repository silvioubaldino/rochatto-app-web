"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { EntityFormProps } from "@/components/entity/quick-create";
import { FieldShell, MoneyField } from "@/components/patterns/fields";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { serviceSchema, toServicePayload, type ServiceFormData } from "@/lib/schemas";
import { useSaveService } from "../mutations";

/** Cadastro de Service (AYD-010 §1): nome, unidade livre, preço e custo de referência. */
export function ServiceForm({ formId, entity, initialName, onSaved, onPendingChange }: EntityFormProps<"service">) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: entity?.name ?? initialName ?? "",
      unit: entity?.unit ?? "",
      reference_price: entity?.reference_price ?? 0,
      reference_cost: entity?.reference_cost ?? 0,
      notes: entity?.notes ?? "",
    },
  });

  const save = useSaveService(entity);
  useEffect(() => onPendingChange?.(save.pending), [save.pending, onPendingChange]);

  async function onSubmit(data: ServiceFormData) {
    const saved = await save.mutate(toServicePayload(data));
    if (saved) onSaved(saved);
  }

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FieldShell label="Nome" htmlFor="service-name" required error={errors.name?.message}>
        <Input id="service-name" autoFocus autoComplete="off" {...register("name")} aria-invalid={!!errors.name} />
      </FieldShell>
      <FieldShell label="Unidade" htmlFor="service-unit">
        <Input id="service-unit" placeholder="m², un, hora, visita…" autoComplete="off" {...register("unit")} />
      </FieldShell>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldShell label="Preço de referência" htmlFor="service-price">
          <Controller
            control={control}
            name="reference_price"
            render={({ field }) => <MoneyField id="service-price" value={field.value} onChange={field.onChange} onBlur={field.onBlur} />}
          />
        </FieldShell>
        <FieldShell label="Custo de referência" htmlFor="service-cost">
          <Controller
            control={control}
            name="reference_cost"
            render={({ field }) => <MoneyField id="service-cost" value={field.value} onChange={field.onChange} onBlur={field.onBlur} />}
          />
        </FieldShell>
      </div>
      <FieldShell label="Observações" htmlFor="service-notes">
        <Textarea id="service-notes" {...register("notes")} />
      </FieldShell>
    </form>
  );
}
