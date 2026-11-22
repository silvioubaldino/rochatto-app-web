import { describe, expect, it } from "vitest";
import type { PendingActionGroup, PendingActionItem } from "@/lib/types";
import {
  buildSections,
  groupSummary,
  groupTitle,
  itemContext,
  itemHref,
  itemLabel,
  parseHorizon,
  rowAction,
} from "./model";

const item = (over: Partial<PendingActionItem> = {}): PendingActionItem => ({
  entity: { type: "SALE", id: "s1" },
  number: 98,
  title: "Alejandra",
  date: "2026-11-29",
  overdue: false,
  amount: 100,
  quantity: null,
  ...over,
});

const group = (kind: PendingActionGroup["kind"]): PendingActionGroup => ({
  kind,
  count: 1,
  overdue_count: 0,
  amount: null,
  items: [],
});

describe("parseHorizon", () => {
  it("aceita 0..60 e cai em 7 no resto", () => {
    expect(parseHorizon("0")).toBe(0);
    expect(parseHorizon("30")).toBe(30);
    expect(parseHorizon("61")).toBe(7);
    expect(parseHorizon("abc")).toBe(7);
    expect(parseHorizon(null)).toBe(7);
  });
});

describe("buildSections", () => {
  it("distribui os grupos nas áreas e some com as vazias", () => {
    const sections = buildSections([group("RECEIVABLE_DUE"), group("DELIVERY_DUE"), group("PAYABLE_DUE")]);
    expect(sections.map((s) => s.section.id)).toEqual(["money", "operations"]);
    expect(sections[0].groups.map((g) => g.kind)).toEqual(["RECEIVABLE_DUE", "PAYABLE_DUE"]);
  });
});

describe("groupTitle", () => {
  it("mostra a data de corte nos grupos que dependem do horizonte", () => {
    expect(groupTitle("RECEIVABLE_DUE", "2026-11-22", 7)).toBe("A receber até 29/11/2026");
    expect(groupTitle("DELIVERY_DUE", "2026-11-22", 0)).toBe("Entregas hoje");
    expect(groupTitle("COST_WITHOUT_PAYEE", "2026-11-22", 7)).toBe("Custos sem credor");
  });
});

describe("groupSummary", () => {
  it("dinheiro e contagem, ou só a contagem", () => {
    expect(groupSummary({ count: 2, amount: 3200 })).toMatch(/3\.200,00 · 2$/);
    expect(groupSummary({ count: 3, amount: null })).toBe("3");
  });
});

describe("rowAction", () => {
  it("cada pendência tem a ação que a resolve", () => {
    expect(rowAction("RECEIVABLE_DUE", item()).id).toBe("settle");
    expect(rowAction("PAYABLE_DUE", item()).label).toBe("Pagar");
    expect(rowAction("DELIVERY_DUE", item()).id).toBe("deliver");
    expect(rowAction("ITEMS_TO_PURCHASE", item()).id).toBe("generate-purchase");
    expect(rowAction("PURCHASE_TO_ORDER", item()).id).toBe("mark-ordered");
    expect(rowAction("PURCHASE_TO_RECEIVE", item()).id).toBe("mark-received");
  });
  it("definir fornecedor abre o atendimento da venda", () => {
    expect(rowAction("ITEMS_WITHOUT_SUPPLIER", item()).href).toBe("/vendas/s1?atendimento=1");
  });
  it("plano e credor levam à conta", () => {
    const o = item({ entity: { type: "OBLIGATION", id: "o1" } });
    expect(rowAction("RECEIVABLE_WITHOUT_PLAN", o).href).toBe("/contas/o1");
    expect(rowAction("COST_WITHOUT_PAYEE", o).href).toBe("/contas/o1");
  });
});

describe("itemHref / itemLabel / itemContext", () => {
  it("a fila a comprar abre a aba certa", () => {
    expect(itemHref("ITEMS_TO_PURCHASE", item({ entity: { type: "SUPPLIER", id: "f1" } }))).toBe("/compras?tab=a-comprar");
  });
  it("usa o número humano", () => {
    expect(itemLabel(item())).toBe("Venda nº 98 · Alejandra");
    expect(itemLabel(item({ number: null }))).toBe("Alejandra");
    expect(itemLabel(item({ entity: { type: "OBLIGATION", id: "o" }, number: 3 }))).toBe("Alejandra");
  });
  it("contexto com data e items", () => {
    expect(itemContext("DELIVERY_DUE", item({ quantity: 2 }))).toBe("prazo 29/11/2026 · 2 items");
    expect(itemContext("NEGATIVE_STOCK", item({ date: null, quantity: -2 }))).toBe("saldo -2");
  });
});
