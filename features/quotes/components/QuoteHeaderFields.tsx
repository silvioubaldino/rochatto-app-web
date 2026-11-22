"use client";

import { Controller, type Control, type FieldErrors, type UseFormSetValue, type UseFormGetValues } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { EntityCombobox } from "@/components/entity/EntityCombobox";
import { useEntityById } from "@/components/entity/entity-queries";
import { DateField, FieldShell } from "@/components/patterns/fields";
import type { QuoteFormData } from "../schemas";

export function QuoteHeaderFields({
  control,
  errors,
  setValue,
  getValues,
  customerId,
  readOnly,
}: {
  control: Control<QuoteFormData>;
  errors: FieldErrors<QuoteFormData>;
  setValue: UseFormSetValue<QuoteFormData>;
  getValues: UseFormGetValues<QuoteFormData>;
  customerId: string;
  readOnly?: boolean;
}) {
  const customer = useEntityById("customer", customerId || null).option?.raw;
  return (
    <div className="grid grid-cols-1 gap-4 rounded-lg border bg-card p-4 sm:grid-cols-2">
      <FieldShell label="Cliente" htmlFor="quote-customer" required error={errors.customer_id?.message} hint={customer?.cidade ? `Obra em ${customer.cidade}` : undefined}>
        <Controller
          control={control}
          name="customer_id"
          render={({ field }) => (
            <EntityCombobox
              kind="customer"
              id="quote-customer"
              value={field.value}
              disabled={readOnly}
              invalid={!!errors.customer_id}
              onChange={(id, option) => {
                field.onChange(id);
                const raw = option?.raw;
                if (raw?.lead_source === "PARTNER" && raw.referrer_id && !getValues("referrer_id")) {
                  setValue("referrer_id", raw.referrer_id, { shouldDirty: true });
                }
              }}
            />
          )}
        />
      </FieldShell>
      <FieldShell label="Data" htmlFor="quote-date" required error={errors.quote_date?.message}>
        <Controller control={control} name="quote_date" render={({ field }) => <DateField id="quote-date" shortcuts={false} disabled={readOnly} value={field.value} onChange={field.onChange} />} />
      </FieldShell>
      <FieldShell label="Indicação (parceiro)" htmlFor="quote-referrer">
        <Controller
          control={control}
          name="referrer_id"
          render={({ field }) => (
            <EntityCombobox kind="partner" id="quote-referrer" value={field.value} placeholder="Nenhuma" disabled={readOnly} onChange={(id) => field.onChange(id)} />
          )}
        />
      </FieldShell>
      <FieldShell label="Observações" htmlFor="quote-notes">
        <Controller control={control} name="notes" render={({ field }) => <Textarea id="quote-notes" rows={2} disabled={readOnly} placeholder="Notas sobre o orçamento…" {...field} />} />
      </FieldShell>
    </div>
  );
}
