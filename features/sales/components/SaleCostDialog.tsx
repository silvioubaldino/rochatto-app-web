"use client";

import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EntityCombobox } from "@/components/entity/EntityCombobox";
import { FieldShell, MoneyField } from "@/components/patterns/fields";
import { ResponsiveDialog } from "@/components/patterns/ResponsiveDialog";
import { Select } from "@/components/patterns/Select";
import { OBLIGATION_WARNING_MESSAGES, SALE_COST_KINDS, SALE_COST_KIND_LABELS } from "@/lib/format";
import { errorMessage } from "@/lib/errors";
import { saleCostSchema, toSaleCostPayload, type SaleCostFormData } from "@/lib/schemas";
import type { SaleCost } from "@/lib/types";
import { defaultPayee } from "../model";
import { useSaveSaleCost } from "../mutations";

const FORM_ID = "sale-cost-form";
const KIND_OPTIONS = SALE_COST_KINDS.map((k) => ({ value: k, label: SALE_COST_KIND_LABELS[k] }));

/** Custo da venda (frete pago, instalador, comissão, outro) com credor: vira conta a pagar. */
export function SaleCostDialog({ saleId, referrerId, cost, onClose }: { saleId: string; /** Partner indicador: credor padrão da comissão. */ referrerId?: string; cost?: SaleCost; onClose: () => void }) {
  const save = useSaveSaleCost(saleId, cost);
  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SaleCostFormData>({
    resolver: zodResolver(saleCostSchema),
    defaultValues: cost
      ? { kind: cost.kind, amount: cost.amount, description: cost.description ?? "", payee_id: cost.payee?.id ?? "" }
      : { kind: "FREIGHT", amount: 0, description: "", payee_id: "" },
  });
  const kind = useWatch({ control, name: "kind" });
  const commission = kind === "COMMISSION";

  async function onSubmit(data: SaleCostFormData) {
    const res = await save.mutate(toSaleCostPayload(data, cost?.sale_item_id));
    if (!res) return;
    if (res.warnings?.includes("OVERSETTLED")) toast.warning(OBLIGATION_WARNING_MESSAGES.OVERSETTLED);
    onClose();
  }

  return (
    <ResponsiveDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={cost ? "Editar custo da venda" : "Novo custo da venda"}
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
        <FieldShell label="Tipo" htmlFor="cost-kind" required>
          <Controller control={control} name="kind" render={({ field }) => (
            <Select
              id="cost-kind"
              value={field.value}
              onChange={(v) => {
                field.onChange(v);
                // O credor da comissão é Partner; os demais, Supplier — a escolha anterior não vale.
                setValue("payee_id", defaultPayee(v as SaleCostFormData["kind"], referrerId));
              }}
              options={KIND_OPTIONS}
            />
          )} />
        </FieldShell>
        <FieldShell label="Valor previsto" htmlFor="cost-amount" required error={errors.amount?.message}>
          <Controller control={control} name="amount" render={({ field }) => <MoneyField id="cost-amount" value={field.value} onChange={field.onChange} invalid={!!errors.amount} />} />
        </FieldShell>
        <FieldShell label={commission ? "Credor (parceiro)" : "Credor (fornecedor ou prestador)"} htmlFor="cost-payee" hint="Quem recebe. Vazio = a definir.">
          <Controller control={control} name="payee_id" render={({ field }) =>
            commission ? (
              <EntityCombobox kind="partner" id="cost-payee" value={field.value} onChange={(id) => field.onChange(id)} placeholder="A definir" />
            ) : (
              <EntityCombobox kind="supplier" id="cost-payee" value={field.value} onChange={(id) => field.onChange(id)} placeholder="A definir" />
            )
          } />
        </FieldShell>
        <FieldShell label="Descrição" htmlFor="cost-desc"><Input id="cost-desc" autoComplete="off" {...register("description")} /></FieldShell>
      </form>
    </ResponsiveDialog>
  );
}
