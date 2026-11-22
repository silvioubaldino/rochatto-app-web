import { describe, expect, it } from "vitest";
import { formatMoney } from "@/lib/format";
import type { Obligation } from "@/lib/types";
import {
  counterpartyKey,
  groupSummary,
  movementCategories,
  movementFiltersFromUrl,
  movementKindOf,
  obligationDue,
  obligationFiltersFromUrl,
  obligationTitle,
  pageLabel,
  resultLinks,
  selectedObligations,
  settleBlocker,
  settleDefaults,
  settleMixedCounterparties,
  settleSchema,
  settleTitle,
  settleTotal,
  settledMessage,
  toMovementPayload,
  toSettlePayload,
} from "./model";

const TODAY = "2026-11-22";
const o = (id: string, open: number, over: Partial<Obligation> = {}): Obligation =>
  ({
    id,
    direction: "PAYABLE",
    open,
    amount: open,
    overdue: false,
    counterparty: { type: "SUPPLIER", id: "f1", name: "Matheus RJ" },
    due_date: null,
    next_installment: null,
    ...over,
  }) as Obligation;
const url = { quando: "", counterparty_type: "", counterparty_id: "", offset: "" };

describe("filtros das contas", () => {
  it("o padrão é Em aberto", () => {
    expect(obligationFiltersFromUrl("PAYABLE", url, TODAY)).toMatchObject({ direction: "PAYABLE", status: "OPEN,PARTIAL", overdue: false, due_to: undefined, offset: 0 });
  });
  it("Vencidas pede só as vencidas; 7 dias corta o vencimento; Todas tira o filtro de situação", () => {
    expect(obligationFiltersFromUrl("PAYABLE", { ...url, quando: "vencidas" }, TODAY).overdue).toBe(true);
    expect(obligationFiltersFromUrl("PAYABLE", { ...url, quando: "7dias" }, TODAY).due_to).toBe("2026-11-29");
    expect(obligationFiltersFromUrl("PAYABLE", { ...url, quando: "todas" }, TODAY).status).toBe("ALL");
  });
  it("credor só vale com tipo e id válidos; valor inválido cai no padrão", () => {
    expect(obligationFiltersFromUrl("PAYABLE", { ...url, counterparty_type: "SUPPLIER", counterparty_id: "f1" }, TODAY)).toMatchObject({ counterparty_type: "SUPPLIER", counterparty_id: "f1" });
    expect(obligationFiltersFromUrl("PAYABLE", { ...url, counterparty_type: "X", counterparty_id: "f1", quando: "zzz", offset: "-3" }, TODAY)).toMatchObject({ counterparty_type: undefined, status: "OPEN,PARTIAL", offset: 0 });
  });
});

describe("agrupar e selecionar", () => {
  it("soma o aberto do credor e separa as contas com saldo", () => {
    const rows = [o("a", 10.1, { overdue: true }), o("b", 0), o("c", 5.2)];
    const s = groupSummary(rows);
    expect(s).toMatchObject({ open: 15.3, count: 3, overdue: 1 });
    expect(s.payable.map((x) => x.id)).toEqual(["a", "c"]);
    expect(counterpartyKey(rows[0])).toBe("SUPPLIER:f1");
    expect(counterpartyKey(o("x", 1, { counterparty: null }))).toBe("none");
  });
  it("seleção só leva contas com saldo, na ordem da lista", () => {
    const rows = [o("a", 10), o("b", 0), o("c", 5)];
    expect(selectedObligations(rows, new Set(["c", "b", "a"])).map((x) => x.id)).toEqual(["a", "c"]);
  });
  it("vencimento e título", () => {
    expect(obligationDue(o("a", 1, { next_installment: { due_date: "2026-12-01T00:00:00Z", amount_open: 1 } }))).toBe("2026-12-01");
    expect(obligationDue(o("a", 1))).toBeNull();
    expect(obligationTitle(o("a", 1))).toBe("Conta a pagar · Matheus RJ");
    expect(pageLabel(50, 120)).toBe("51–100 de 120");
    expect(pageLabel(0, 0)).toBe("0 de 0");
  });
});

describe("Pagar / Receber", () => {
  it("cada conta começa com o que está em aberto; forma por escolher", () => {
    expect(settleDefaults([o("a", 10), o("b", 5.5)], TODAY)).toEqual({
      occurred_on: TODAY,
      payment_method: "",
      allocations: [{ obligation_id: "a", amount: 10 }, { obligation_id: "b", amount: 5.5 }],
    });
  });
  it("exige a forma de pagamento e valor maior que zero", () => {
    const base = settleDefaults([o("a", 10)], TODAY);
    expect(settleSchema.safeParse(base).success).toBe(false);
    expect(settleSchema.safeParse({ ...base, payment_method: "PIX" }).success).toBe(true);
    expect(settleSchema.safeParse({ ...base, payment_method: "PIX", allocations: [{ obligation_id: "a", amount: 0 }] }).success).toBe(false);
  });
  it("payload de POST /settlements e total em centavos", () => {
    const data = settleSchema.parse({ ...settleDefaults([o("a", 0.1), o("b", 0.2)], TODAY), payment_method: "PIX" });
    expect(settleTotal(data.allocations)).toBe(0.3);
    expect(toSettlePayload(data)).toEqual({ movement: { occurred_on: TODAY, payment_method: "PIX" }, allocations: [{ obligation_id: "a", amount: 0.1 }, { obligation_id: "b", amount: 0.2 }] });
  });
  it("não mistura a pagar com a receber; avisa credores diferentes", () => {
    expect(settleBlocker([])).toMatch(/Não há contas/);
    expect(settleBlocker([o("a", 1), o("b", 1, { direction: "RECEIVABLE" })])).toMatch(/só contas a pagar ou só/);
    expect(settleBlocker([o("a", 1)])).toBeNull();
    expect(settleMixedCounterparties([o("a", 1), o("b", 1, { counterparty: { type: "SUPPLIER", id: "f2", name: "Nivaldo" } })])).toBe(true);
    expect(settleMixedCounterparties([o("a", 1)])).toBe(false);
  });
  it("título e mensagem falam em Receber/Pagar", () => {
    expect(settleTitle([o("a", 1, { direction: "RECEIVABLE", counterparty: { type: "CUSTOMER", id: "c", name: "Alejandra" } })])).toBe("Receber — Alejandra");
    expect(settleTitle([o("a", 1), o("b", 1)])).toBe("Pagar 2 contas");
    expect(settledMessage("RECEIVABLE", 3200, 1)).toBe(`Recebimento de ${formatMoney(3200)} registrado.`);
    expect(settledMessage("PAYABLE", 200, 2)).toBe(`Pagamento de ${formatMoney(200)} registrado (2 contas).`);
  });
});

describe("movimentações", () => {
  it("categorias pelo sinal; na correção entra a atual", () => {
    expect(movementCategories("INCOME")).toEqual(["OTHER_INCOME"]);
    expect(movementCategories("EXPENSE")).toContain("VEHICLE");
    expect(movementCategories("EXPENSE")).not.toContain("OTHER_INCOME");
    expect(movementCategories("INCOME", "SALE_RECEIPT")[0]).toBe("SALE_RECEIPT");
  });
  it("o sinal vem da categoria", () => {
    const base = { amount: 150, occurred_on: TODAY, payment_method: "PIX" as const, counterparty_name: " ", description: "Combustível" };
    expect(toMovementPayload({ ...base, category: "VEHICLE" })).toEqual({ occurred_on: TODAY, amount: -150, category: "VEHICLE", payment_method: "PIX", counterparty_name: null, description: "Combustível" });
    expect(toMovementPayload({ ...base, category: "OTHER_INCOME", payment_method: "" }).amount).toBe(150);
    expect(movementKindOf({ amount: -1 })).toBe("EXPENSE");
    expect(movementKindOf({ amount: 1 })).toBe("INCOME");
  });
  it("período padrão é o mês corrente; filtros inválidos caem fora", () => {
    const f = movementFiltersFromUrl({ from: "", to: "", category: "", direction: "X", alocacao: "sem", offset: "" }, new Date(2026, 10, 22));
    expect(f).toMatchObject({ from: "2026-11-01", to: "2026-11-22", direction: undefined, unallocated_only: true, offset: 0 });
  });
});

describe("resultado", () => {
  it("os números levam à lista que os compõe, no mesmo período", () => {
    const l = resultLinks({ from: "2026-11-01", to: "2026-11-22" });
    expect(l.sales).toBe("/vendas?from=2026-11-01&to=2026-11-22");
    expect(l.unallocated).toBe("/movimentacoes?from=2026-11-01&to=2026-11-22&alocacao=sem");
    expect(l.outflows).toContain("direction=OUT");
    expect(l.payable).toBe("/contas/pagar");
  });
});
