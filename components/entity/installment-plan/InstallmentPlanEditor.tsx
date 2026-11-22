"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateField, FieldShell, MoneyField } from "@/components/patterns/fields";
import { MoneyText } from "@/components/patterns/values";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import {
  PLAN_PRESETS,
  PLAN_PRESET_LABELS,
  planGap,
  resolvePlan,
  toCustom,
  validatePlan,
  type PlanLine,
  type PlanState,
} from "./plan-model";

let counter = 0;

/**
 * Plano de parcelas com presets (à vista · entrada + saldo · parcelas iguais · personalizado ·
 * definir depois). Controlado: `value` é o estado; as parcelas saem de `resolvePlan`.
 * Mexer numa linha de um preset vira "Personalizado" com as linhas atuais.
 */
export function InstallmentPlanEditor({
  total,
  today,
  value,
  onChange,
  idPrefix = "plan",
  disabled,
}: {
  /** Valor a parcelar (preço ao cliente, ou o em aberto da conta). */
  total: number;
  today: string;
  value: PlanState;
  onChange: (next: PlanState) => void;
  idPrefix?: string;
  disabled?: boolean;
}) {
  const lines = resolvePlan(value, total, today);
  const error = validatePlan(lines, total);
  const gap = planGap(lines, total);
  const set = (part: Partial<PlanState>) => onChange({ ...value, ...part });

  function editLine(index: number, part: Partial<PlanLine>) {
    const next = lines.map((l, i) => (i === index ? { ...l, ...part } : l));
    onChange(toCustom(value, total, today, next));
  }

  return (
    <div className="space-y-3">
      <div role="group" aria-label="Forma de recebimento" className="flex flex-wrap gap-2">
        {PLAN_PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            disabled={disabled}
            aria-pressed={value.preset === p}
            onClick={() => (p === "custom" ? onChange(toCustom({ ...value }, total, today)) : set({ preset: p }))}
            className={cn(
              "inline-flex min-h-11 items-center rounded-full border px-4 text-base transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:min-h-8 md:px-3 md:text-sm",
              value.preset === p ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted",
            )}
          >
            {PLAN_PRESET_LABELS[p]}
          </button>
        ))}
      </div>

      {value.preset === "down" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FieldShell label="Entrada (%)" htmlFor={`${idPrefix}-pct`}>
            <Input
              id={`${idPrefix}-pct`}
              inputMode="decimal"
              value={String(value.downPercent).replace(".", ",")}
              onChange={(e) => {
                const n = Number(e.target.value.replace(",", "."));
                if (Number.isFinite(n)) set({ downPercent: Math.min(Math.max(n, 0), 100) });
              }}
            />
          </FieldShell>
          <FieldShell label="Data da entrada" htmlFor={`${idPrefix}-down-date`}>
            <DateField id={`${idPrefix}-down-date`} shortcuts={false} value={value.downDate} onChange={(v) => set({ downDate: v })} />
          </FieldShell>
          <FieldShell label="Data do saldo" htmlFor={`${idPrefix}-balance-date`}>
            <DateField id={`${idPrefix}-balance-date`} shortcuts={false} value={value.balanceDate} onChange={(v) => set({ balanceDate: v })} />
          </FieldShell>
        </div>
      )}

      {value.preset === "equal" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FieldShell label="Nº de parcelas" htmlFor={`${idPrefix}-count`}>
            <Input
              id={`${idPrefix}-count`}
              inputMode="numeric"
              value={String(value.count)}
              onChange={(e) => {
                const n = Math.round(Number(e.target.value));
                if (Number.isFinite(n) && n >= 1 && n <= 60) set({ count: n });
              }}
            />
          </FieldShell>
          <FieldShell label="1º vencimento" htmlFor={`${idPrefix}-first`}>
            <DateField id={`${idPrefix}-first`} shortcuts={false} value={value.firstDue} onChange={(v) => set({ firstDue: v })} />
          </FieldShell>
        </div>
      )}

      {lines.length > 0 && (
        <ul aria-label="Parcelas" className="space-y-2">
          {lines.map((l, i) => (
            <li key={l.key} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
              <FieldShell label={`Parcela ${i + 1} · vencimento`} htmlFor={`${idPrefix}-d-${l.key}`}>
                <DateField id={`${idPrefix}-d-${l.key}`} shortcuts={false} value={l.due_date} onChange={(v) => editLine(i, { due_date: v })} />
              </FieldShell>
              <FieldShell label="Valor" htmlFor={`${idPrefix}-a-${l.key}`}>
                <MoneyField id={`${idPrefix}-a-${l.key}`} value={l.amount} onChange={(v) => editLine(i, { amount: v })} />
              </FieldShell>
              {value.preset === "custom" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remover parcela ${i + 1}`}
                  onClick={() => onChange(toCustom(value, total, today, lines.filter((_, j) => j !== i)))}
                >
                  <Trash2 className="text-danger" aria-hidden />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {value.preset === "custom" && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange(
              toCustom(value, total, today, [
                ...lines,
                { key: `plan-new-${++counter}`, due_date: today, amount: Math.max(gap, 0) },
              ]),
            )
          }
        >
          <Plus aria-hidden />
          Parcela
        </Button>
      )}

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {value.preset === "later"
          ? "A conta fica sem plano e vira pendência em Hoje."
          : gap > 0
            ? `Faltam ${formatMoney(gap)} para completar ${formatMoney(total)}.`
            : <>Total das parcelas <MoneyText value={total - gap} /></>}
      </p>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
