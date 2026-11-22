import { addDays, format, parseISO } from "date-fns";

/** "yyyy-MM-dd" → "dd/MM/yyyy". */
export function formatDate(isoDate: string): string {
  return format(parseISO(isoDate), "dd/MM/yyyy");
}

/** Data e hora em pt-BR, no fuso local: "dd/MM/yyyy HH:mm". */
export function formatDateTime(isoDate: string): string {
  return format(parseISO(isoDate), "dd/MM/yyyy HH:mm");
}

/** Data em "yyyy-MM-dd" (valor de <input type="date">), no fuso local. */
export function toISODate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** Hoje em "yyyy-MM-dd". `today` é injetável para testes. */
export function todayISO(today: Date = new Date()): string {
  return toISODate(today);
}

/** `iso` + `days` dias, em "yyyy-MM-dd". */
export function addDaysISO(iso: string, days: number): string {
  return toISODate(addDays(parseISO(iso), days));
}

/** Dias inteiros de `from` até `to` (negativo se `to` for antes). */
export function daysBetween(from: string, to: string): number {
  const a = parseISO(from).getTime();
  const b = parseISO(to).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** Prazo vencido: `due` estritamente antes de `today` (comparação de "yyyy-MM-dd"). */
export function isPastDue(due: string | null | undefined, today: string = todayISO()): boolean {
  return !!due && due < today;
}

/** "hoje", "amanhã", "ontem", "em 3 dias", "há 12 dias" (relativo a `today`). */
export function formatRelativeDays(iso: string, today: string = todayISO()): string {
  const d = daysBetween(today, iso);
  if (d === 0) return "hoje";
  if (d === 1) return "amanhã";
  if (d === -1) return "ontem";
  return d > 0 ? `em ${d} dias` : `há ${-d} dias`;
}
