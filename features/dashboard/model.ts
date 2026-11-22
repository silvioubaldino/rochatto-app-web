// Regras puras dos Indicadores (T15 — AYD-005/011): tom da margem, plural, links de drill-down.
import type { Tone } from "@/lib/format";

/** Margem média do ranking: > 30% bom, 15–30% atenção, abaixo disso ruim; sem valor, neutro. */
export function marginTone(margin: number | null | undefined): Tone {
  if (margin === null || margin === undefined) return "neutral";
  if (margin > 30) return "success";
  if (margin >= 15) return "warning";
  return "danger";
}

export const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** Os números abrem a lista que os compõe (KPI com link). */
export const KPI_LINKS = {
  receivable: "/contas/receber",
  payable: "/contas/pagar",
  toDeliver: "/vendas?delivery_status=TO_DELIVER",
} as const;

/** Vendas do período: a lista de Vendas já filtrada pelo mesmo período. */
export const salesLink = (period: { from: string; to: string }): string => `/vendas?from=${period.from}&to=${period.to}`;

/** Quantos produtos o ranking mostra. */
export const RANKING_SIZE = 10;
