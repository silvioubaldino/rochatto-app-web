import { round2 } from "@/components/entity/items-grid";
import type { Obligation, Quote, Venda } from "@/lib/types";

export interface PartnerStats {
  customers: number;
  quotes: number;
  sales: number;
  revenue: number;
  conversion: number | null;
  commissionsOpen: number;
}

export function partnerStats(
  customers: readonly unknown[],
  quotes: readonly Quote[],
  sales: readonly Venda[],
  commissions: readonly Obligation[],
): PartnerStats {
  const active = sales.filter((s) => s.delivery_status !== "CANCELED");
  const won = quotes.filter((q) => q.status === "WON").length;
  return {
    customers: customers.length,
    quotes: quotes.length,
    sales: active.length,
    revenue: round2(active.reduce((s, v) => s + v.total_venda, 0)),
    conversion: quotes.length > 0 ? won / quotes.length : null,
    commissionsOpen: round2(commissions.reduce((s, o) => s + o.open, 0)),
  };
}

export const PARTNER_TABS = ["clientes", "orcamentos", "vendas", "comissoes"] as const;
export type PartnerTab = (typeof PARTNER_TABS)[number];
