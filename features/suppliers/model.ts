import { round2 } from "@/components/entity/items-grid";
import { addDaysISO } from "@/lib/format";
import type { Obligation, PendingSaleItemGroup, PurchaseListItem } from "@/lib/types";

export interface SupplierStats {
  /** Soma em aberto das contas a pagar. */
  payable: number;
  overdueCount: number;
  /** Custo das compras criadas nos últimos `windowDays` dias. */
  bought: number;
  windowDays: number;
  /** Items na fila "a comprar" deste fornecedor. */
  queueItems: number;
}

/** Janela do "comprado no período" do Fornecedor 360 (T10). */
export const SUPPLIER_WINDOW_DAYS = 90;

/** Números do Fornecedor 360 (T10). `today` injetável para teste. */
export function supplierStats(
  purchases: readonly Pick<PurchaseListItem, "total_cost" | "created_at">[],
  payables: readonly Pick<Obligation, "open" | "overdue">[],
  queue: PendingSaleItemGroup | undefined,
  today: string,
  windowDays = SUPPLIER_WINDOW_DAYS,
): SupplierStats {
  const since = addDaysISO(today, -windowDays);
  return {
    payable: round2(payables.reduce((s, o) => s + o.open, 0)),
    overdueCount: payables.filter((o) => o.overdue && o.open > 0).length,
    bought: round2(purchases.filter((p) => (p.created_at ?? today).slice(0, 10) >= since).reduce((s, p) => s + (p.total_cost ?? 0), 0)),
    windowDays,
    queueItems: queue?.items.length ?? 0,
  };
}

export const SUPPLIER_TABS = ["compras", "contas", "a-comprar"] as const;
export type SupplierTab = (typeof SUPPLIER_TABS)[number];

/** Contas a pagar com saldo — as que "Pagar contas em aberto" leva ao Pagar. */
export const openPayables = <T extends Pick<Obligation, "open">>(list: readonly T[]): T[] => list.filter((o) => o.open > 0);
