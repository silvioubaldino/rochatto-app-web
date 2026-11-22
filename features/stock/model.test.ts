import { describe, expect, it } from "vitest";
import { adjustmentSchema, isNegative, movementHref, stockBalanceQuery, toAdjustmentPayload, totalStockValue } from "./model";

describe("estoque", () => {
  it("monta a consulta do saldo", () => {
    expect(stockBalanceQuery()).toBe("/stock/balance");
    expect(stockBalanceQuery({ q: "rock", only_negative: true })).toBe("/stock/balance?q=rock&only_negative=true");
  });
  it("total em estoque: o da api ou a soma", () => {
    expect(totalStockValue([{ stock_value: 10.1 }, { stock_value: 20.2 }])).toBe(30.3);
    expect(totalStockValue([{ stock_value: 10 }], 99)).toBe(99);
  });
  it("saldo negativo e link de origem do movimento", () => {
    expect(isNegative({ balance: -1 })).toBe(true);
    expect(isNegative({ balance: 0 })).toBe(false);
    expect(movementHref({ kind: "INFLOW", reference_id: "p1" })).toBe("/compras/p1");
    expect(movementHref({ kind: "OUTFLOW", reference_id: "s1" })).toBe("/vendas/s1");
    expect(movementHref({ kind: "ADJUSTMENT", reference_id: "a1" })).toBeNull();
    expect(movementHref({ kind: "INFLOW", reference_id: null })).toBeNull();
  });
  it("baixar vira quantidade negativa; custo 0 vira null", () => {
    const base = { product_id: "p", direction: "OUT" as const, quantity: 3, unit_cost: 0, reason: "COUNT" as const, adjusted_at: "2026-11-22", notes: "" };
    expect(toAdjustmentPayload(base)).toMatchObject({ quantity: -3, unit_cost: null, notes: null });
    expect(toAdjustmentPayload({ ...base, direction: "IN", unit_cost: 5 })).toMatchObject({ quantity: 3, unit_cost: 5 });
  });
  it("exige produto, quantidade positiva e motivo", () => {
    expect(adjustmentSchema.safeParse({ product_id: "", direction: "IN", quantity: 0, unit_cost: 0, reason: "COUNT", adjusted_at: "x", notes: "" }).success).toBe(false);
  });
});
