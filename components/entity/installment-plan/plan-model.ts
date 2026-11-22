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
  notes?: string;
}

export interface PlanState {
  preset: PlanPreset;
  downPercent: number;
  downDate: string;
  balanceDate: string;
  count: number;
  firstDue: string;
  lines: PlanLine[];
}

const cents = (n: number) => Math.round(n * 100);
const fromCents = (c: number) => c / 100;

let n = 0;
const key = () => `plan-${++n}`;

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

export function validatePlan(lines: readonly PlanLine[], total: number): string | null {
  if (lines.some((l) => !(l.amount > 0))) return "Toda parcela precisa de valor maior que zero.";
  if (lines.some((l) => !l.due_date)) return "Toda parcela precisa de data.";
  if (cents(planTotal(lines)) > cents(total)) return "A soma das parcelas passa do valor a parcelar.";
  return null;
}

export function planGap(lines: readonly PlanLine[], total: number): number {
  return fromCents(cents(total) - cents(planTotal(lines)));
}

export function toInstallmentsPayload(lines: readonly PlanLine[]) {
  return lines.map((l) => ({
    due_date: l.due_date,
    amount: l.amount,
    ...(l.payment_method ? { payment_method: l.payment_method } : {}),
    ...(l.notes?.trim() ? { notes: l.notes.trim() } : {}),
  }));
}

export function planFromInstallments(
  installments: readonly { id: string; due_date: string; amount: number; payment_method: PaymentMethod | null; notes: string | null }[],
  today: string,
): PlanState {
  return {
    ...initialPlanState(today, "custom"),
    lines: installments.map((i) => ({
      key: `inst-${i.id}`,
      due_date: i.due_date.slice(0, 10),
      amount: i.amount,
      ...(i.payment_method ? { payment_method: i.payment_method } : {}),
      ...(i.notes ? { notes: i.notes } : {}),
    })),
  };
}

export function toCustom(state: PlanState, total: number, today: string, lines?: PlanLine[]): PlanState {
  return { ...state, preset: "custom", lines: lines ?? resolvePlan(state, total, today).map((l) => ({ ...l, key: key() })) };
}
