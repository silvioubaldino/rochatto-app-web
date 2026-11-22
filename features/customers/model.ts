import { round2 } from "@/components/entity/items-grid";
import type { Obligation, Venda } from "@/lib/types";

export interface CustomerStats {
  totalBought: number;
  profit: number;
  receivable: number;
  overdueCount: number;
  lastSale: string | null;
}

/** Números do Cliente 360 (T08): canceladas não entram (RN-04). */
export function customerStats(sales: readonly Venda[], receivables: readonly Obligation[]): CustomerStats {
  const active = sales.filter((s) => s.delivery_status !== "CANCELED");
  return {
    totalBought: round2(active.reduce((s, v) => s + v.total_venda, 0)),
    profit: round2(active.reduce((s, v) => s + v.lucro, 0)),
    receivable: round2(receivables.reduce((s, o) => s + o.open, 0)),
    overdueCount: receivables.filter((o) => o.overdue && o.open > 0).length,
    lastSale: active.map((v) => v.data_venda.slice(0, 10)).sort().at(-1) ?? null,
  };
}

/** Só os dígitos do telefone; com 10–11 dígitos assume Brasil (55). Vazio → null. */
export function whatsappHref(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  return `https://wa.me/${digits.length <= 11 ? `55${digits}` : digits}`;
}

export function telHref(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/[^\d+]/g, "");
  return digits.length >= 8 ? `tel:${digits}` : null;
}

export const CUSTOMER_TABS = ["orcamentos", "vendas", "receber", "dados"] as const;
export type CustomerTab = (typeof CUSTOMER_TABS)[number];
