"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityCombobox } from "@/components/entity/EntityCombobox";
import { FieldShell, MoneyField, QuantityField } from "@/components/patterns/fields";
import { ResponsiveDialog } from "@/components/patterns/ResponsiveDialog";
import { errorMessage } from "@/lib/errors";
import type { PurchaseItem } from "@/lib/types";
import { purchaseItemSchema, toPurchaseItemPayload, type PurchaseItemFormData } from "../schemas";
import { useSavePurchaseItem } from "../mutations";

const FORM_ID = "purchase-item-form";

export function PurchaseItemDialog({ purchaseId, item, onClose }: { purchaseId: string; item?: PurchaseItem; onClose: () => void }) {
  const save = useSavePurchaseItem(purchaseId, item);
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<PurchaseItemFormData>({
    resolver: zodResolver(purchaseItemSchema),
    defaultValues: item ? { product_id: item.product_id, quantity: item.quantity, unit_cost: item.unit_cost } : { product_id: "", quantity: 0, unit_cost: 0 },
  });

  async function onSubmit(data: PurchaseItemFormData) {
    if ((await save.mutate(toPurchaseItemPayload(data))) !== undefined) onClose();
  }

  return (
    <ResponsiveDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={item ? "Editar linha" : "Adicionar produto"}
      size="sm"
      dismissible={!save.pending}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={save.pending}>Cancelar</Button>
          <Button type="submit" form={FORM_ID} disabled={save.pending}>
            {save.pending && <Loader2 className="animate-spin" aria-hidden />}
            {item ? "Salvar" : "Adicionar"}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {save.error != null && <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">{errorMessage(save.error, "Erro ao salvar a linha.")}</p>}
        <FieldShell label="Produto" htmlFor="pi-product" required error={errors.product_id?.message}>
          <Controller control={control} name="product_id" render={({ field }) => (
            <EntityCombobox
              kind="product"
              id="pi-product"
              value={field.value}
              invalid={!!errors.product_id}
              onChange={(id, option) => {
                field.onChange(id);
                if (!item && option?.raw.custo_referencia) setValue("unit_cost", option.raw.custo_referencia);
              }}
            />
          )} />
        </FieldShell>
        <div className="grid grid-cols-2 gap-3">
          <FieldShell label="Quantidade" htmlFor="pi-qty" required error={errors.quantity?.message}>
            <Controller control={control} name="quantity" render={({ field }) => <QuantityField id="pi-qty" value={field.value} onChange={field.onChange} invalid={!!errors.quantity} />} />
          </FieldShell>
          <FieldShell label="Custo unitário" htmlFor="pi-cost" required error={errors.unit_cost?.message}>
            <Controller control={control} name="unit_cost" render={({ field }) => <MoneyField id="pi-cost" value={field.value} onChange={field.onChange} invalid={!!errors.unit_cost} />} />
          </FieldShell>
        </div>
      </form>
    </ResponsiveDialog>
  );
}
