"use client";

import { Controller, useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DateField, FieldShell } from "@/components/patterns/fields";
import { ResponsiveDialog } from "@/components/patterns/ResponsiveDialog";
import { errorMessage } from "@/lib/errors";
import { toObligationPatchPayload } from "@/lib/schemas";
import type { Obligation } from "@/lib/types";
import { usePatchObligation } from "../mutations";

const FORM_ID = "obligation-patch-form";

export function ObligationPatchDialog({ obligation, onClose }: { obligation: Pick<Obligation, "id" | "due_date" | "notes">; onClose: () => void }) {
  const patch = usePatchObligation(obligation.id);
  const { control, register, handleSubmit } = useForm({ defaultValues: { due_date: obligation.due_date?.slice(0, 10) ?? "", notes: obligation.notes ?? "" } });

  async function onSubmit(data: { due_date: string; notes: string }) {
    const payload = toObligationPatchPayload(data, obligation);
    if (Object.keys(payload).length === 0) return onClose();
    if (await patch.mutate(payload)) onClose();
  }

  return (
    <ResponsiveDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Prazo e observações"
      size="sm"
      dismissible={!patch.pending}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={patch.pending}>Cancelar</Button>
          <Button type="submit" form={FORM_ID} disabled={patch.pending}>
            {patch.pending && <Loader2 className="animate-spin" aria-hidden />}
            Salvar
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {patch.error != null && <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">{errorMessage(patch.error, "Erro ao salvar a conta.")}</p>}
        <FieldShell label="Prazo final" htmlFor="ob-due" hint="Vazio remove o prazo.">
          <Controller control={control} name="due_date" render={({ field }) => <DateField id="ob-due" value={field.value} onChange={field.onChange} />} />
        </FieldShell>
        <FieldShell label="Observações" htmlFor="ob-notes"><Textarea id="ob-notes" {...register("notes")} /></FieldShell>
      </form>
    </ResponsiveDialog>
  );
}
