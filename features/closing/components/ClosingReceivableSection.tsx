"use client";

import { InstallmentPlanEditor, type PlanState } from "@/components/entity/installment-plan";
import { Select } from "@/components/patterns/Select";
import { FieldShell } from "@/components/patterns/fields";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, formatMoney } from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";

/** ③ Recebimento: presets de plano, "Recebi a entrada agora" e a forma de pagamento. */
export function ClosingReceivableSection({
  total,
  today,
  plan,
  onPlanChange,
  receivedNow,
  method,
  firstAmount,
  onReceivedNowChange,
  onMethodChange,
}: {
  total: number;
  today: string;
  plan: PlanState;
  onPlanChange: (plan: PlanState) => void;
  receivedNow: boolean;
  method: PaymentMethod | "";
  /** Valor da primeira parcela (o que "Recebi agora" quita); null se não há plano. */
  firstAmount: number | null;
  onReceivedNowChange: (v: boolean) => void;
  onMethodChange: (m: PaymentMethod | "") => void;
}) {
  const canReceive = firstAmount !== null;
  return (
    <div className="space-y-4">
      <InstallmentPlanEditor idPrefix="closing-plan" total={total} today={today} value={plan} onChange={onPlanChange} />
      <div className="space-y-3 rounded-lg bg-muted/40 p-3">
        <label className="flex min-h-11 items-center gap-3 text-base md:min-h-8 md:text-sm">
          <input
            type="checkbox"
            className="size-5 md:size-4"
            checked={receivedNow && canReceive}
            disabled={!canReceive}
            onChange={(e) => onReceivedNowChange(e.target.checked)}
          />
          <span>Recebi a entrada agora{canReceive ? ` (${formatMoney(firstAmount)})` : ""}</span>
        </label>
        {receivedNow && canReceive && (
          <FieldShell label="Forma de pagamento" htmlFor="closing-method" required>
            <Select
              id="closing-method"
              value={method}
              placeholder="Selecione…"
              onChange={(v) => onMethodChange(v as PaymentMethod | "")}
              options={PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABELS[m] }))}
            />
          </FieldShell>
        )}
      </div>
    </div>
  );
}
