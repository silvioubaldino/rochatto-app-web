import { describe, expect, it } from "vitest";
import type { Obligation, Quote, Venda } from "@/lib/types";
import { partnerStats } from "./model";

const quote = (status: Quote["status"]) => ({ id: status + Math.random(), status }) as Quote;
const sale = (total: number, delivery_status: Venda["delivery_status"] = "TO_DELIVER") => ({ id: String(Math.random()), total_venda: total, delivery_status }) as Venda;

describe("partnerStats", () => {
  it("clientes, orçamentos, vendas ativas, faturamento, conversão e comissões a pagar", () => {
    const s = partnerStats(
      [1, 2],
      [quote("WON"), quote("OPEN"), quote("LOST"), quote("WON")],
      [sale(100), sale(50.5), sale(999, "CANCELED")],
      [{ open: 30 } as Obligation, { open: 12.5 } as Obligation],
    );
    expect(s).toEqual({ customers: 2, quotes: 4, sales: 2, revenue: 150.5, conversion: 0.5, commissionsOpen: 42.5 });
  });
  it("sem orçamentos não há conversão", () => expect(partnerStats([], [], [], []).conversion).toBeNull());
});
