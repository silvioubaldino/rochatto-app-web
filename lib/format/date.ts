import { addDays, format, parseISO } from "date-fns";

export function formatDate(isoDate: string): string {
  return format(parseISO(isoDate), "dd/MM/yyyy");
}

export function formatDateTime(isoDate: string): string {
  return format(parseISO(isoDate), "dd/MM/yyyy HH:mm");
}

export function toISODate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function todayISO(today: Date = new Date()): string {
  return toISODate(today);
}

export function addDaysISO(iso: string, days: number): string {
  return toISODate(addDays(parseISO(iso), days));
}

export function daysBetween(from: string, to: string): number {
  const a = parseISO(from).getTime();
  const b = parseISO(to).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function isPastDue(due: string | null | undefined, today: string = todayISO()): boolean {
  return !!due && due < today;
}

export function formatRelativeDays(iso: string, today: string = todayISO()): string {
  const d = daysBetween(today, iso);
  if (d === 0) return "hoje";
  if (d === 1) return "amanhã";
  if (d === -1) return "ontem";
  return d > 0 ? `em ${d} dias` : `há ${-d} dias`;
}
