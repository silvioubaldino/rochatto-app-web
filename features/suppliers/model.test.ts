import { describe, expect, it } from "vitest";
import { openPayables, supplierStats } from "./model";

const group = { supplier_id: "f1", supplier_name: "X", items: [{ id: "a" }, { id: "b" }] } as never;

describe("supplierStats", () => {
  const today = "2026-11-22";
  it("soma o aberto, conta vencidas e compras da janela", () => {
    const s = supplierStats(
      [
        { total_cost: 100, created_at: "2026-11-01T10:00:00Z" },
        { total_cost: 50.5, created_at: "2026-09-01T10:00:00Z" },
        { total_cost: 999, created_at: "2026-01-01T10:00:00Z" },
      ],
      [{ open: 30.1, overdue: true }, { open: 0, overdue: true }, { open: 20, overdue: false }],
      group,
      today,
    );
    expect(s).toEqual({ payable: 50.1, overdueCount: 1, bought: 150.5, windowDays: 90, queueItems: 2 });
  });
  it("sem fila → 0 itens", () => {
    expect(supplierStats([], [], undefined, today).queueItems).toBe(0);
  });
  it("só contas com saldo vão para o Pagar", () => {
    expect(openPayables([{ open: 0 }, { open: 5 }])).toEqual([{ open: 5 }]);
  });
});
