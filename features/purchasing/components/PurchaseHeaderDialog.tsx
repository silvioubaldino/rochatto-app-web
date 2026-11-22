"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DateField, FieldShell } from "@/components/patterns/fields";
import { ResponsiveDialog } from "@/components/patterns/ResponsiveDialog";
import { errorMessage } from "@/lib/errors";
import type { PurchaseDetail } from "@/lib/types";
import { purchaseHeaderSchema, type PurchaseHeaderFormData } from "../schemas";
import { useUpdatePurchase } from "../mutations";
import { emptyToNull } from "@/lib/schemas";

const FORM_ID = "purchase-header-form";

/** Previsão no fornecedor e observações da compra. */
export function PurchaseHeaderDialog({ purchase, onClose }: { purchase: PurchaseDetail; onClose: () => void }) {
  const update = useUpdatePurchase(purchase);
  const { control, register, handleSubmit } = useForm<PurchaseHeaderFormData>({
    resolver: zodResolver(purchaseHeaderSchema),
    defaultValues: { expected_date: purchase.expected_date?.slice(0, 10) ?? "", notes: purchase.notes ?? "" },
  });

  async function onSubmit(data: PurchaseHeaderFormData) {
    if ((await update.mutate({ expected_date: emptyToNull(data.expected_date), notes: emptyToNull(data.notes) })) !== undefined) onClose();
  }

  return (
    <ResponsiveDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Editar compra"
      size="sm"
      dismissible={!update.pending}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={update.pending}>Cancelar</Button>
          <Button type="submit" form={FORM_ID} disabled={update.pending}>
            {update.pending && <Loader2 className="animate-spin" aria-hidden />}
            Salvar
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {update.error != null && <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">{errorMessage(update.error, "Erro ao salvar a compra.")}</p>}
        <FieldShell label="Previsão no fornecedor" htmlFor="ph-expected">
          <Controller control={control} name="expected_date" render={({ field }) => <DateField id="ph-expected" value={field.value} onChange={field.onChange} />} />
        </FieldShell>
        <FieldShell label="Observações" htmlFor="ph-notes"><Textarea id="ph-notes" {...register("notes")} /></FieldShell>
      </form>
    </ResponsiveDialog>
  );
}
