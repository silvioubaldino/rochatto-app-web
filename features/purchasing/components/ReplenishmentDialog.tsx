"use client";

import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EntityCombobox } from "@/components/entity/EntityCombobox";
import { DateField, FieldShell, MoneyField, QuantityField } from "@/components/patterns/fields";
import { ResponsiveDialog } from "@/components/patterns/ResponsiveDialog";
import { Select } from "@/components/patterns/Select";
import { ALLOCATION_METHODS, ALLOCATION_METHOD_LABELS } from "@/lib/format";
import { errorMessage } from "@/lib/errors";
import { replenishmentSchema, toReplenishmentPayload, type ReplenishmentFormData } from "../schemas";
import { useCreateReplenishment } from "../mutations";

const FORM_ID = "replenishment-form";
const METHOD_OPTIONS = ALLOCATION_METHODS.map((m) => ({ value: m, label: ALLOCATION_METHOD_LABELS[m] }));
const EMPTY_LINE = { product_id: "", quantity: 0, unit_cost: 0 };

/** Nova compra para repor o estoque (kind STOCK_REPLENISHMENT) com linhas de Product. `product` opcional pré-preenche a 1ª linha. */
export function ReplenishmentDialog({ onClose, product }: { onClose: () => void; product?: { id: string; unit_cost: number } }) {
  const router = useRouter();
  const create = useCreateReplenishment();
  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ReplenishmentFormData>({
    resolver: zodResolver(replenishmentSchema),
    defaultValues: {
      supplier_id: "",
      expected_date: "",
      notes: "",
      allocation_method: "BY_QUANTITY",
      items: [product ? { product_id: product.id, quantity: 0, unit_cost: product.unit_cost } : EMPTY_LINE],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  async function onSubmit(data: ReplenishmentFormData) {
    const created = await create.mutate(toReplenishmentPayload(data));
    if (created) {
      onClose();
      if (created.id) router.push(`/compras/${created.id}`);
    }
  }

  return (
    <ResponsiveDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Nova compra para estoque"
      size="lg"
      dismissible={!create.pending}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={create.pending}>Cancelar</Button>
          <Button type="submit" form={FORM_ID} disabled={create.pending}>
            {create.pending && <Loader2 className="animate-spin" aria-hidden />}
            Criar compra
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {create.error != null && <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">{errorMessage(create.error, "Erro ao criar a compra.")}</p>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldShell label="Fornecedor" htmlFor="rp-supplier" required error={errors.supplier_id?.message}>
            <Controller control={control} name="supplier_id" render={({ field }) => (
              <EntityCombobox kind="supplier" id="rp-supplier" value={field.value} onChange={(id) => field.onChange(id)} invalid={!!errors.supplier_id} prefer={(s) => s.kind === "STONE"} />
            )} />
          </FieldShell>
          <FieldShell label="Previsão no fornecedor" htmlFor="rp-expected">
            <Controller control={control} name="expected_date" render={({ field }) => <DateField id="rp-expected" value={field.value} onChange={field.onChange} />} />
          </FieldShell>
        </div>
        <FieldShell label="Rateio dos custos adicionais" htmlFor="rp-alloc">
          <Controller control={control} name="allocation_method" render={({ field }) => <Select id="rp-alloc" value={field.value} onChange={(v) => field.onChange(v)} options={METHOD_OPTIONS} />} />
        </FieldShell>

        <fieldset className="space-y-3">
          <legend className="mb-1 text-sm font-medium">Produtos <span aria-hidden>*</span></legend>
          {fields.map((field, index) => {
            const e = errors.items?.[index];
            return (
              <div key={field.id} className="space-y-3 rounded-lg border p-3">
                <FieldShell label={`Produto ${index + 1}`} htmlFor={`rp-p-${field.id}`} error={e?.product_id?.message}>
                  <Controller control={control} name={`items.${index}.product_id`} render={({ field: f }) => (
                    <EntityCombobox
                      kind="product"
                      id={`rp-p-${field.id}`}
                      value={f.value}
                      invalid={!!e?.product_id}
                      onChange={(id, option) => {
                        f.onChange(id);
                        const cost = option?.raw.custo_referencia;
                        if (cost) setValue(`items.${index}.unit_cost`, cost);
                      }}
                    />
                  )} />
                </FieldShell>
                <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                  <FieldShell label="Quantidade" htmlFor={`rp-q-${field.id}`} error={e?.quantity?.message}>
                    <Controller control={control} name={`items.${index}.quantity`} render={({ field: f }) => <QuantityField id={`rp-q-${field.id}`} value={f.value} onChange={f.onChange} invalid={!!e?.quantity} />} />
                  </FieldShell>
                  <FieldShell label="Custo unitário" htmlFor={`rp-c-${field.id}`} error={e?.unit_cost?.message}>
                    <Controller control={control} name={`items.${index}.unit_cost`} render={({ field: f }) => <MoneyField id={`rp-c-${field.id}`} value={f.value} onChange={f.onChange} invalid={!!e?.unit_cost} />} />
                  </FieldShell>
                  <Button type="button" variant="ghost" size="icon" aria-label={`Remover produto ${index + 1}`} disabled={fields.length === 1} onClick={() => remove(index)}>
                    <Trash2 className="text-danger" aria-hidden />
                  </Button>
                </div>
              </div>
            );
          })}
          {errors.items?.message && <p role="alert" className="text-xs text-destructive">{errors.items.message}</p>}
          <Button type="button" variant="outline" size="sm" onClick={() => append(EMPTY_LINE)}>
            <Plus aria-hidden />
            Produto
          </Button>
        </fieldset>

        <FieldShell label="Observações" htmlFor="rp-notes"><Textarea id="rp-notes" {...register("notes")} /></FieldShell>
      </form>
    </ResponsiveDialog>
  );
}
