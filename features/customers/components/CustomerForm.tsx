"use client";

import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { EntityCombobox } from "@/components/entity/EntityCombobox";
import type { EntityFormProps } from "@/components/entity/quick-create";
import { FieldShell } from "@/components/patterns/fields";
import { Select } from "@/components/patterns/Select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LEAD_SOURCES, LEAD_SOURCE_LABELS } from "@/lib/format";
import { clienteSchema, toClientePayload, type ClienteFormData } from "@/lib/schemas";
import { useSaveCustomer } from "../mutations";

const LEAD_OPTIONS = [
  { value: "", label: "Não informada" },
  ...LEAD_SOURCES.map((s) => ({ value: s, label: LEAD_SOURCE_LABELS[s] })),
];

/** Cadastro de Customer (RF-01). Parceiro indicador se escolhe/cria por EntityCombobox. */
export function CustomerForm({ formId, entity, initialName, onSaved, onPendingChange }: EntityFormProps<"customer">) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<ClienteFormData>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      nome: entity?.nome ?? initialName ?? "",
      telefone: entity?.telefone ?? "",
      email: entity?.email ?? "",
      endereco: entity?.endereco ?? "",
      cidade: entity?.cidade ?? "",
      observacoes: entity?.observacoes ?? "",
      lead_source: entity?.lead_source ?? "",
      referrer_id: entity?.referrer_id ?? "",
    },
  });
  const leadSource = useWatch({ control, name: "lead_source" });

  const save = useSaveCustomer(entity);
  useEffect(() => onPendingChange?.(save.pending), [save.pending, onPendingChange]);

  async function onSubmit(data: ClienteFormData) {
    const saved = await save.mutate(toClientePayload(data));
    if (saved) onSaved(saved);
  }

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FieldShell label="Nome" htmlFor="customer-name" required error={errors.nome?.message}>
        <Input id="customer-name" autoFocus autoComplete="off" {...register("nome")} aria-invalid={!!errors.nome} />
      </FieldShell>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldShell label="Telefone" htmlFor="customer-phone">
          <Input id="customer-phone" type="tel" inputMode="tel" autoComplete="off" {...register("telefone")} />
        </FieldShell>
        <FieldShell label="E-mail" htmlFor="customer-email" error={errors.email?.message}>
          <Input id="customer-email" type="email" inputMode="email" autoComplete="off" {...register("email")} aria-invalid={!!errors.email} />
        </FieldShell>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldShell label="Endereço da obra" htmlFor="customer-address">
          <Input id="customer-address" autoComplete="off" {...register("endereco")} />
        </FieldShell>
        <FieldShell label="Cidade" htmlFor="customer-city">
          <Input id="customer-city" autoComplete="off" {...register("cidade")} />
        </FieldShell>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldShell label="Origem" htmlFor="customer-lead">
          <Controller
            control={control}
            name="lead_source"
            render={({ field }) => (
              <Select
                id="customer-lead"
                value={field.value ?? ""}
                options={LEAD_OPTIONS}
                onChange={(v) => {
                  field.onChange(v);
                  // referrer_id só existe com origem Parceiro (regra da API).
                  if (v !== "PARTNER") setValue("referrer_id", "");
                }}
              />
            )}
          />
        </FieldShell>

        {leadSource === "PARTNER" && (
          <FieldShell label="Parceiro" htmlFor="customer-referrer" required error={errors.referrer_id?.message}>
            <Controller
              control={control}
              name="referrer_id"
              render={({ field }) => (
                <EntityCombobox
                  kind="partner"
                  id="customer-referrer"
                  value={field.value ?? ""}
                  selectedLabel={entity?.referrer_name ?? undefined}
                  invalid={!!errors.referrer_id}
                  onChange={(id) => field.onChange(id)}
                />
              )}
            />
          </FieldShell>
        )}
      </div>

      <FieldShell label="Observações" htmlFor="customer-notes">
        <Textarea id="customer-notes" {...register("observacoes")} />
      </FieldShell>
    </form>
  );
}
