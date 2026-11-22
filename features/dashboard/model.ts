import type { Tone } from "@/lib/format";

export function marginTone(margin: number | null | undefined): Tone {
  if (margin === null || margin === undefined) return "neutral";
  if (margin > 30) return "success";
  if (margin >= 15) return "warning";
  return "danger";
}

export const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

export const KPI_LINKS = {
  receivable: "/contas/receber",
  payable: "/contas/pagar",
  toDeliver: "/vendas?delivery_status=TO_DELIVER",
} as const;

export const salesLink = (period: { from: string; to: string }): string => `/vendas?from=${period.from}&to=${period.to}`;

export const RANKING_SIZE = 10;
