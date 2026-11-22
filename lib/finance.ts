import {
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
} from "date-fns";

export type FinancePreset = "this_month" | "last_month" | "last_90_days" | "this_year";

export const FINANCE_PRESETS: { value: FinancePreset; label: string }[] = [
  { value: "this_month", label: "Este mês" },
  { value: "last_month", label: "Mês passado" },
  { value: "last_90_days", label: "Últimos 90 dias" },
  { value: "this_year", label: "Este ano" },
];

export interface FinancePeriod {
  from: string;
  to: string;
}

const iso = (d: Date) => format(d, "yyyy-MM-dd");

export function financePresetPeriod(preset: FinancePreset, today: Date = new Date()): FinancePeriod {
  switch (preset) {
    case "this_month":
      return { from: iso(startOfMonth(today)), to: iso(today) };
    case "last_month": {
      const m = subMonths(today, 1);
      return { from: iso(startOfMonth(m)), to: iso(endOfMonth(m)) };
    }
    case "last_90_days":
      return { from: iso(subDays(today, 89)), to: iso(today) };
    case "this_year":
      return { from: iso(startOfYear(today)), to: iso(today) };
  }
}

export function matchFinancePreset(period: FinancePeriod, today: Date = new Date()): FinancePreset | null {
  for (const { value } of FINANCE_PRESETS) {
    const p = financePresetPeriod(value, today);
    if (p.from === period.from && p.to === period.to) return value;
  }
  return null;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isValidISODate(v: string | null | undefined): v is string {
  if (!v || !ISO_DATE.test(v)) return false;
  const d = parseISO(v);
  return !Number.isNaN(d.getTime()) && iso(d) === v;
}

export function parseFinancePeriod(
  from: string | null | undefined,
  to: string | null | undefined,
  today: Date = new Date(),
): FinancePeriod {
  const def = financePresetPeriod("this_month", today);
  return {
    from: isValidISODate(from) ? from : def.from,
    to: isValidISODate(to) ? to : def.to,
  };
}

export function validateFinancePeriod(period: FinancePeriod): string | null {
  if (!isValidISODate(period.from) || !isValidISODate(period.to)) return "Informe as duas datas.";
  if (period.from > period.to) return "A data inicial não pode ser depois da final.";
  return null;
}
