"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { EntityFormProps } from "@/components/entity/quick-create";
import { FieldShell } from "@/components/patterns/fields";
import { Select } from "@/components/patterns/Select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SUPPLIER_KINDS, SUPPLIER_KIND_LABELS } from "@/lib/format";
import { supplierSchema, type SupplierFormData } from "../schemas";
import { useSaveSupplier } from "../mutations";

const KIND_OPTIONS = SUPPLIER_KINDS.map((k) => ({ value: k, label: SUPPLIER_KIND_LABELS[k] }));

/** Cadastro de fornecedor ou prestador (credor que não é Partner). */
export function SupplierForm({ formId, entity, initialName, onSaved, onPendingChange }: EntityFormProps<"supplier">) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      nome: entity?.nome ?? initialName ?? "",
      kind: entity?.kind ?? "STONE",
      cidade: entity?.cidade ?? "",
      telefone: entity?.telefone ?? "",
      observacoes: entity?.observacoes ?? "",
    },
  });

  const save = useSaveSupplier(entity);
  useEffect(() => onPendingChange?.(save.pending), [save.pending, onPendingChange]);

  async function onSubmit(data: SupplierFormData) {
    const saved = await save.mutate(data);
    if (saved) onSaved(saved);
  }

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FieldShell label="Nome" htmlFor="supplier-name" required error={errors.nome?.message}>
        <Input id="supplier-name" autoFocus autoComplete="off" {...register("nome")} aria-invalid={!!errors.nome} />
      </FieldShell>
      <FieldShell label="Tipo" htmlFor="supplier-kind" required>
        <Controller
          control={control}
          name="kind"
          render={({ field }) => <Select id="supplier-kind" value={field.value} onChange={field.onChange} options={KIND_OPTIONS} />}
        />
      </FieldShell>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldShell label="Cidade" htmlFor="supplier-city">
          <Input id="supplier-city" autoComplete="off" {...register("cidade")} />
        </FieldShell>
        <FieldShell label="Telefone" htmlFor="supplier-phone">
          <Input id="supplier-phone" type="tel" inputMode="tel" autoComplete="off" {...register("telefone")} />
        </FieldShell>
      </div>
      <FieldShell label="Observações" htmlFor="supplier-notes">
        <Textarea id="supplier-notes" {...register("observacoes")} />
      </FieldShell>
    </form>
  );
}
