import { describe, expect, it } from "vitest";
import type { Obligation, Venda } from "@/lib/types";
import { customerStats, telHref, whatsappHref } from "./model";

const sale = (over: Partial<Venda>): Venda => ({
  id: "s", cliente_id: "c", cliente_nome: "A", delivery_status: "TO_DELIVER", payment_status: "PENDING", data_venda: "2026-11-01",
  total_venda: 100, total_custo: 60, total_recebido: 0, a_receber: 100, receivable: 100, lucro: 40, created_at: "", ...over,
});
const ob = (over: Partial<Obligation>): Obligation => ({
  id: "o", direction: "RECEIVABLE", origin: { type: "SALE", id: "s", label: "" }, counterparty: null, amount: 100, settled: 0, open: 100,
  status: "OPEN", due_date: null, overdue: false, next_installment: null, notes: null, ...over,
});

describe("customerStats", () => {
  it("soma sem canceladas; a receber e vencidas das contas; última venda", () => {
    const s = customerStats(
      [sale({}), sale({ id: "2", total_venda: 50, lucro: 10, data_venda: "2026-11-17" }), sale({ id: "3", delivery_status: "CANCELED", total_venda: 999 })],
      [ob({ open: 30, overdue: true }), ob({ id: "o2", open: 20 })],
    );
    expect(s).toEqual({ totalBought: 150, profit: 50, receivable: 50, overdueCount: 1, lastSale: "2026-11-17" });
  });
  it("sem vendas", () => expect(customerStats([], []).lastSale).toBeNull());
});

describe("contato", () => {
  it("WhatsApp: só dígitos, 55 para número brasileiro; telefone curto não gera link", () => {
    expect(whatsappHref("(67) 99999-0000")).toBe("https://wa.me/5567999990000");
    expect(whatsappHref("+55 67 99999-0000")).toBe("https://wa.me/5567999990000");
    expect(whatsappHref("123")).toBeNull();
    expect(whatsappHref(undefined)).toBeNull();
  });
  it("tel:", () => {
    expect(telHref("(67) 99999-0000")).toBe("tel:67999990000");
    expect(telHref("")).toBeNull();
  });
});
