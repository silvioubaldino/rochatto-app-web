"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { EntityFormProps } from "@/components/entity/quick-create";
import { FieldShell } from "@/components/patterns/fields";
import { Select } from "@/components/patterns/Select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PARTNER_TYPES, PARTNER_TYPE_LABELS } from "@/lib/format";
import { partnerSchema, toPartnerPayload, type PartnerFormData, type PartnerFormInput } from "@/lib/schemas";
import { useSavePartner } from "../mutations";

const TYPE_OPTIONS = [
  { value: "", label: "Selecione…" },
  ...PARTNER_TYPES.map((t) => ({ value: t, label: PARTNER_TYPE_LABELS[t] })),
];

/** Cadastro enxuto de Partner (RF-04). */
export function PartnerForm({ formId, entity, initialName, onSaved, onPendingChange }: EntityFormProps<"partner">) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<PartnerFormInput, unknown, PartnerFormData>({
    resolver: zodResolver(partnerSchema),
    defaultValues: {
      name: entity?.name ?? initialName ?? "",
      type: entity?.type ?? "",
      phone: entity?.phone ?? "",
      notes: entity?.notes ?? "",
    },
  });

  const save = useSavePartner(entity);
  useEffect(() => onPendingChange?.(save.pending), [save.pending, onPendingChange]);

  async function onSubmit(data: PartnerFormData) {
    const saved = await save.mutate(toPartnerPayload(data));
    if (saved) onSaved(saved);
  }

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FieldShell label="Nome" htmlFor="partner-name" required error={errors.name?.message}>
        <Input id="partner-name" autoFocus autoComplete="off" {...register("name")} aria-invalid={!!errors.name} />
      </FieldShell>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldShell label="Tipo" htmlFor="partner-type" required error={errors.type?.message}>
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <Select id="partner-type" value={field.value ?? ""} onChange={field.onChange} options={TYPE_OPTIONS} invalid={!!errors.type} />
            )}
          />
        </FieldShell>
        <FieldShell label="Telefone" htmlFor="partner-phone">
          <Input id="partner-phone" type="tel" inputMode="tel" autoComplete="off" {...register("phone")} />
        </FieldShell>
      </div>
      <FieldShell label="Observações" htmlFor="partner-notes">
        <Textarea id="partner-notes" {...register("notes")} />
      </FieldShell>
    </form>
  );
}
