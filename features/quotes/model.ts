import { docNumber, formatRelativeDays } from "@/lib/format";
import type { Quote } from "@/lib/types";

export function quoteTitle(q: Pick<Quote, "number" | "id">): string {
  return docNumber("Orçamento", q.number, q.id);
}

export function quoteAge(q: Pick<Quote, "status" | "quote_date">, today?: string): string | null {
  return q.status === "OPEN" ? formatRelativeDays(q.quote_date.slice(0, 10), today) : null;
}

export const QUOTE_CHIPS = [
  { value: "", label: "Todos" },
  { value: "OPEN", label: "Abertos" },
  { value: "WON", label: "Ganhos" },
  { value: "LOST", label: "Perdidos" },
] as const;

export function estimatedMargin(q: Pick<Quote, "items" | "total_quote">): number | null {
  if (!q.items?.length || q.total_quote <= 0) return null;
  const cost = q.items.reduce((s, i) => s + i.quantity * i.unit_cost, 0);
  return Math.round(((q.total_quote - cost) / q.total_quote) * 10000) / 100;
}
