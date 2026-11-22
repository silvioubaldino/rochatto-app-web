"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EntityCombobox } from "@/components/entity/EntityCombobox";
import { FieldShell, MoneyField } from "@/components/patterns/fields";
import { ResponsiveDialog } from "@/components/patterns/ResponsiveDialog";
import { Select } from "@/components/patterns/Select";
import { OBLIGATION_WARNING_MESSAGES, PURCHASE_CHARGE_KINDS, PURCHASE_CHARGE_KIND_LABELS } from "@/lib/format";
import { errorMessage } from "@/lib/errors";
import type { PurchaseCharge } from "@/lib/types";
import { purchaseChargeSchema, toPurchaseChargePayload, type PurchaseChargeFormData } from "../schemas";
import { useSavePurchaseCharge } from "../mutations";

const KIND_OPTIONS = PURCHASE_CHARGE_KINDS.map((k) => ({ value: k, label: PURCHASE_CHARGE_KIND_LABELS[k] }));
const FORM_ID = "purchase-charge-form";

export function PurchaseChargeDialog({ purchaseId, defaultSupplierId, charge, onClose }: { purchaseId: string; defaultSupplierId: string; charge?: PurchaseCharge; onClose: () => void }) {
  const save = useSavePurchaseCharge(purchaseId, charge);
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PurchaseChargeFormData>({
    resolver: zodResolver(purchaseChargeSchema),
    defaultValues: charge
      ? { kind: charge.kind, amount: charge.amount, description: charge.description ?? "", payee_supplier_id: charge.payee_supplier_id ?? "" }
      : { kind: "FREIGHT", amount: 0, description: "", payee_supplier_id: defaultSupplierId },
  });

  async function onSubmit(data: PurchaseChargeFormData) {
    const res = await save.mutate(toPurchaseChargePayload(data));
    if (!res) return;
    if (res.warnings?.includes("OVERSETTLED")) toast.warning(OBLIGATION_WARNING_MESSAGES.OVERSETTLED);
    onClose();
  }

  return (
    <ResponsiveDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={charge ? "Editar custo adicional" : "Novo custo adicional"}
      size="sm"
      dismissible={!save.pending}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={save.pending}>Cancelar</Button>
          <Button type="submit" form={FORM_ID} disabled={save.pending}>
            {save.pending && <Loader2 className="animate-spin" aria-hidden />}
            Salvar
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {save.error != null && <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">{errorMessage(save.error, "Erro ao salvar o custo.")}</p>}
        <FieldShell label="Tipo" htmlFor="pc-kind" required>
          <Controller control={control} name="kind" render={({ field }) => <Select id="pc-kind" value={field.value} onChange={(v) => field.onChange(v)} options={KIND_OPTIONS} />} />
        </FieldShell>
        <FieldShell label="Valor" htmlFor="pc-amount" required error={errors.amount?.message}>
          <Controller control={control} name="amount" render={({ field }) => <MoneyField id="pc-amount" value={field.value} onChange={field.onChange} invalid={!!errors.amount} />} />
        </FieldShell>
        <FieldShell label="Credor" htmlFor="pc-payee" hint="Quem recebe este valor. Vazio = a definir.">
          <Controller control={control} name="payee_supplier_id" render={({ field }) => <EntityCombobox kind="supplier" id="pc-payee" value={field.value} onChange={(id) => field.onChange(id)} placeholder="A definir" />} />
        </FieldShell>
        <FieldShell label="Descrição" htmlFor="pc-desc"><Input id="pc-desc" autoComplete="off" {...register("description")} /></FieldShell>
      </form>
    </ResponsiveDialog>
  );
}
