// Plano de recebimento/pagamento em parcelas: presets e validação — puros e testados.
// Serve ao Fechar venda (T05) e à venda (T06); a fase U5 o reaproveita nas contas.
import { addMonths, format, parseISO } from "date-fns";
import { addDaysISO } from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";

export type PlanPreset = "cash" | "down" | "equal" | "custom" | "later";

export const PLAN_PRESET_LABELS: Record<PlanPreset, string> = {
  cash: "À vista",
  down: "Entrada + saldo",
  equal: "Parcelas iguais",
  custom: "Personalizado",
  later: "Definir depois",
};

export const PLAN_PRESETS: readonly PlanPreset[] = ["cash", "down", "equal", "custom", "later"];

export interface PlanLine {
  key: string;
  due_date: string;
  amount: number;
  payment_method?: PaymentMethod;
}

export interface PlanState {
  preset: PlanPreset;
  /** Percentual da entrada (preset `down`). */
  downPercent: number;
  downDate: string;
  balanceDate: string;
  /** Nº de parcelas (preset `equal`). */
  count: number;
  firstDue: string;
  /** Linhas do preset `custom`. */
  lines: PlanLine[];
}

const cents = (n: number) => Math.round(n * 100);
const fromCents = (c: number) => c / 100;

let n = 0;
const key = () => `plan-${++n}`;

/** Divide `total` em `parts` partes iguais; os centavos que sobram ficam na ÚLTIMA. */
export function splitEqual(total: number, parts: number): number[] {
  if (parts < 1) return [];
  const base = Math.floor(cents(total) / parts);
  const amounts = Array<number>(parts).fill(base);
  amounts[parts - 1] += cents(total) - base * parts;
  return amounts.map(fromCents);
}

export function downPaymentAmount(total: number, percent: number): number {
  const pct = Math.min(Math.max(percent, 0), 100);
  return fromCents(Math.round((cents(total) * pct) / 100));
}

export function addMonthsISO(iso: string, months: number): string {
  return format(addMonths(parseISO(iso), months), "yyyy-MM-dd");
}

/** Estado inicial: entrada de 50% hoje + saldo em 7 dias (o dono fecha sem tocar em nada). */
export function initialPlanState(today: string, preset: PlanPreset = "down"): PlanState {
  return {
    preset,
    downPercent: 50,
    downDate: today,
    balanceDate: addDaysISO(today, 7),
    count: 2,
    firstDue: addDaysISO(today, 30),
    lines: [],
  };
}

/** As parcelas que o estado representa para `total` (centavos na última; Σ = total). */
export function resolvePlan(state: PlanState, total: number, today: string): PlanLine[] {
  if (total <= 0) return [];
  switch (state.preset) {
    case "later":
      return [];
    case "cash":
      return [{ key: "cash", due_date: today, amount: total }];
    case "down": {
      const down = downPaymentAmount(total, state.downPercent);
      const lines: PlanLine[] = [];
      if (down > 0) lines.push({ key: "down", due_date: state.downDate, amount: down });
      const rest = fromCents(cents(total) - cents(down));
      if (rest > 0) lines.push({ key: "balance", due_date: state.balanceDate, amount: rest });
      return lines;
    }
    case "equal": {
      const count = Math.max(1, Math.round(state.count));
      return splitEqual(total, count).map((amount, i) => ({
        key: `eq-${i}`,
        due_date: addMonthsISO(state.firstDue, i),
        amount,
      }));
    }
    case "custom":
      return state.lines;
  }
}

export const planTotal = (lines: readonly PlanLine[]): number => fromCents(lines.reduce((s, l) => s + cents(l.amount), 0));

/** Mensagem de erro do plano (Σ > total, valor ≤ 0, data vazia), ou null. */
export function validatePlan(lines: readonly PlanLine[], total: number): string | null {
  if (lines.some((l) => !(l.amount > 0))) return "Toda parcela precisa de valor maior que zero.";
  if (lines.some((l) => !l.due_date)) return "Toda parcela precisa de data.";
  if (cents(planTotal(lines)) > cents(total)) return "A soma das parcelas passa do valor da venda.";
  return null;
}

/** Diferença entre o total e as parcelas (para avisar "faltam R$ x" no personalizado). */
export function planGap(lines: readonly PlanLine[], total: number): number {
  return fromCents(cents(total) - cents(planTotal(lines)));
}

/** Corpo de `installments` da api (`PUT /obligations/{id}/installments` e `closing.receivable_plan`). */
export function toInstallmentsPayload(lines: readonly PlanLine[]) {
  return lines.map((l) => ({
    due_date: l.due_date,
    amount: l.amount,
    ...(l.payment_method ? { payment_method: l.payment_method } : {}),
  }));
}

/** Quando o dono edita uma linha de um preset, vira `custom` com as linhas atuais. */
export function toCustom(state: PlanState, total: number, today: string, lines?: PlanLine[]): PlanState {
  return { ...state, preset: "custom", lines: lines ?? resolvePlan(state, total, today).map((l) => ({ ...l, key: key() })) };
}
