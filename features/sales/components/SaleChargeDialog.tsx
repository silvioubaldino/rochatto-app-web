"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldShell, MoneyField } from "@/components/patterns/fields";
import { ResponsiveDialog } from "@/components/patterns/ResponsiveDialog";
import { Select } from "@/components/patterns/Select";
import { SALE_CHARGE_KINDS, SALE_CHARGE_KIND_LABELS } from "@/lib/format";
import { errorMessage } from "@/lib/errors";
import { saleChargeSchema, toSaleChargePayload, type SaleChargeFormData } from "@/lib/schemas";
import type { SaleCharge } from "@/lib/types";
import { useSaveSaleCharge } from "../mutations";

const FORM_ID = "sale-charge-form";
const KIND_OPTIONS = SALE_CHARGE_KINDS.map((k) => ({ value: k, label: SALE_CHARGE_KIND_LABELS[k] }));

/** Cobrança adicional ao cliente (frete cobrado…): soma ao preço e à conta a receber. */
export function SaleChargeDialog({ saleId, charge, onClose }: { saleId: string; charge?: SaleCharge; onClose: () => void }) {
  const save = useSaveSaleCharge(saleId, charge);
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SaleChargeFormData>({
    resolver: zodResolver(saleChargeSchema),
    defaultValues: charge ? { kind: charge.kind, amount: charge.amount, description: charge.description ?? "" } : { kind: "FREIGHT", amount: 0, description: "" },
  });

  async function onSubmit(data: SaleChargeFormData) {
    if (await save.mutate(toSaleChargePayload(data))) onClose();
  }

  return (
    <ResponsiveDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={charge ? "Editar cobrança" : "Nova cobrança ao cliente"}
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
        {save.error != null && <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">{errorMessage(save.error, "Erro ao salvar a cobrança.")}</p>}
        <FieldShell label="Tipo" htmlFor="sc-kind" required>
          <Controller control={control} name="kind" render={({ field }) => <Select id="sc-kind" value={field.value} onChange={(v) => field.onChange(v)} options={KIND_OPTIONS} />} />
        </FieldShell>
        <FieldShell label="Valor" htmlFor="sc-amount" required error={errors.amount?.message}>
          <Controller control={control} name="amount" render={({ field }) => <MoneyField id="sc-amount" value={field.value} onChange={field.onChange} invalid={!!errors.amount} />} />
        </FieldShell>
        <FieldShell label="Descrição" htmlFor="sc-desc"><Input id="sc-desc" autoComplete="off" {...register("description")} /></FieldShell>
      </form>
    </ResponsiveDialog>
  );
}
