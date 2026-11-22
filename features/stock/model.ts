// Regras puras do Estoque (T13 — AYD-011): consulta do saldo, sinal do ajuste, rótulos.
import { z } from "zod";
import { emptyToNull } from "@/lib/schemas";
import type { StockBalance, StockMovement } from "@/lib/types";

export const STOCK_TABS = ["saldo", "ajustes"] as const;
export type StockTab = (typeof STOCK_TABS)[number];

export const STOCK_CHIPS = [
  { value: "", label: "Todos" },
  { value: "negativo", label: "Saldo negativo" },
] as const;

export interface StockBalanceFilters {
  q?: string;
  only_negative?: boolean;
}

/** Caminho da api (e chave SWR) de `GET /stock/balance`. */
export function stockBalanceQuery(f: StockBalanceFilters = {}): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.only_negative) p.set("only_negative", "true");
  const qs = p.toString();
  return qs ? `/stock/balance?${qs}` : "/stock/balance";
}

/** Total em estoque: o da api, ou a soma das linhas. */
export function totalStockValue(rows: readonly Pick<StockBalance, "stock_value">[], fromApi?: number): number {
  return fromApi ?? Math.round(rows.reduce((s, b) => s + (b.stock_value ?? 0) * 100, 0)) / 100;
}

export const isNegative = (b: Pick<StockBalance, "balance">): boolean => b.balance < 0;

/** Compra (entrada) ou venda (saída) que originou o movimento do extrato; ajuste não tem origem. */
export function movementHref(m: Pick<StockMovement, "kind" | "reference_id">): string | null {
  if (!m.reference_id) return null;
  if (m.kind === "INFLOW") return `/compras/${m.reference_id}`;
  if (m.kind === "OUTFLOW") return `/vendas/${m.reference_id}`;
  return null;
}

/** Ajuste: o dono escolhe "somar" ou "baixar" e digita a quantidade sempre positiva. */
export const ADJUSTMENT_DIRECTIONS = [
  { value: "IN", label: "Somar ao saldo" },
  { value: "OUT", label: "Baixar do saldo" },
] as const;

export const adjustmentSchema = z.object({
  product_id: z.string().min(1, "Selecione o produto"),
  direction: z.enum(["IN", "OUT"]),
  quantity: z.number({ error: "Informe a quantidade" }).gt(0, "A quantidade deve ser maior que zero"),
  unit_cost: z.number().min(0, "Custo não pode ser negativo"),
  reason: z.enum(["INITIAL", "COUNT", "OTHER"], { error: "Escolha o motivo" }),
  adjusted_at: z.string().min(1, "Informe a data"),
  notes: z.string(),
});
export type AdjustmentFormData = z.infer<typeof adjustmentSchema>;

/** Corpo de `POST /stock/adjustments`: quantidade com sinal; custo 0 = sem custo informado. */
export function toAdjustmentPayload(d: AdjustmentFormData) {
  return {
    product_id: d.product_id,
    quantity: d.direction === "OUT" ? -d.quantity : d.quantity,
    unit_cost: d.unit_cost > 0 ? d.unit_cost : null,
    reason: d.reason,
    adjusted_at: d.adjusted_at,
    notes: emptyToNull(d.notes),
  };
}
