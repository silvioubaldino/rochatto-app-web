import { describe, expect, it } from "vitest";
import type { Obligation, PendingSaleItemGroup, PurchaseDetail } from "@/lib/types";
import {
  filtersFromUrl,
  isExpectedLate,
  nextStep,
  openPayables,
  purchaseTotals,
  purchasesQuery,
  queueCost,
  selectedQueueItems,
  sortQueueGroups,
  statusTrail,
  toggleId,
  transitionsFor,
  undoTarget,
} from "./model";

const base = {
  id: "p1",
  number: 12,
  kind: "MADE_TO_ORDER",
  status: "OPEN",
  supplier_id: "f1",
  supplier_name: "Matheus RJ",
  expected_date: null,
  items: [],
  sale_items: [{ id: "si1", sale_id: "s1", customer_name: "A", produto_nome: "Rock face", quantidade: 2, custo_unit: 10 }],
  obligations: [],
} as unknown as PurchaseDetail;
const purchase = (over: Partial<PurchaseDetail>): PurchaseDetail => ({ ...base, ...over });
const payable = (open: number) => ({ id: "o1", direction: "PAYABLE", open }) as Obligation;
const ctx = { today: "2026-11-22" };

describe("lista", () => {
  it("monta o caminho da api com os filtros", () => {
    expect(purchasesQuery()).toBe("/purchases");
    expect(purchasesQuery({ status: "OPEN", supplier_id: "f1", open_only: true })).toBe("/purchases?status=OPEN&supplier_id=f1&open_only=true");
  });
  it("traduz a URL e ignora valor inválido", () => {
    const v = { status: "XX", kind: "STOCK_REPLENISHMENT", supplier_id: "", from: "", to: "", contas: "overdue" };
    expect(filtersFromUrl(v)).toEqual({ status: undefined, kind: "STOCK_REPLENISHMENT", supplier_id: undefined, from: undefined, to: undefined, open_only: undefined, overdue: true });
  });
  it("previsão atrasada só vale até chegar", () => {
    expect(isExpectedLate({ expected_date: "2026-11-01", status: "ORDERED" }, "2026-11-22")).toBe(true);
    expect(isExpectedLate({ expected_date: "2026-11-01", status: "RECEIVED" }, "2026-11-22")).toBe(false);
    expect(isExpectedLate({ expected_date: null, status: "OPEN" }, "2026-11-22")).toBe(false);
  });
  it("soma custo e a pagar", () => {
    expect(purchaseTotals([{ total_cost: 100, payable: 40 }, { total_cost: 50, payable: 0 }])).toEqual({ cost: 150, payable: 40 });
  });
});

describe("trilha e transições", () => {
  it("marca feito, atual e a fazer", () => {
    expect(statusTrail("ORDERED").map((s) => s.state)).toEqual(["done", "current", "todo"]);
    expect(statusTrail("OPEN").map((s) => s.state)).toEqual(["current", "todo", "todo"]);
  });
  it("só o Recebida pede confirmação", () => {
    expect(transitionsFor("OPEN", "MADE_TO_ORDER").map((t) => [t.to, t.confirm])).toEqual([["ORDERED", false]]);
    expect(transitionsFor("ORDERED", "MADE_TO_ORDER").map((t) => [t.to, t.confirm])).toEqual([["RECEIVED", true], ["OPEN", false]]);
    expect(transitionsFor("RECEIVED", "MADE_TO_ORDER")).toEqual([]);
  });
  it("a reposição avisa que entra no estoque", () => {
    expect(transitionsFor("ORDERED", "STOCK_REPLENISHMENT")[0].description).toContain("estoque");
  });
  it("desfaz pedida e volta; recebida é definitiva", () => {
    expect(undoTarget("ORDERED")).toBe("OPEN");
    expect(undoTarget("OPEN")).toBe("ORDERED");
    expect(undoTarget("RECEIVED")).toBeNull();
  });
});

describe("próximo passo", () => {
  it("sem linhas → adicionar Items", () => {
    expect(nextStep(purchase({ sale_items: [] }), ctx)?.id).toBe("add-items");
    expect(nextStep(purchase({ kind: "STOCK_REPLENISHMENT", items: [], sale_items: [] }), ctx)?.label).toBe("Adicionar produto");
  });
  it("aberta com linhas → pedir", () => {
    expect(nextStep(purchase({}), ctx)?.id).toBe("mark-ordered");
  });
  it("pedida só pede o recebimento quando a previsão chegou", () => {
    expect(nextStep(purchase({ status: "ORDERED", expected_date: "2026-11-22" }), ctx)?.id).toBe("mark-received");
    expect(nextStep(purchase({ status: "ORDERED", expected_date: "2026-12-30" }), ctx)).toBeNull();
  });
  it("recebida com venda a entregar → entregar", () => {
    const salesById = { s1: { delivery_status: "TO_DELIVER" as const } };
    expect(nextStep(purchase({ status: "RECEIVED" }), { ...ctx, salesById })?.id).toBe("deliver");
  });
  it("com saldo a pagar → pagar; quitada → nada", () => {
    expect(nextStep(purchase({ status: "RECEIVED", obligations: [payable(50)] }), ctx)?.id).toBe("pay");
    expect(nextStep(purchase({ status: "RECEIVED", obligations: [payable(0)] }), ctx)).toBeNull();
    expect(openPayables([payable(0), payable(5)])).toHaveLength(1);
  });
});

describe("fila a comprar", () => {
  const item = (id: string, q: number, c: number) => ({ id, sale_id: "s", customer_name: "x", produto_id: null, produto_nome: "p", quantidade: q, custo_unit: c, sale_date: "2026-11-01" });
  const groups: PendingSaleItemGroup[] = [
    { supplier_id: null, supplier_name: null, items: [item("a", 1, 1)] },
    { supplier_id: "f2", supplier_name: "Zeca", items: [item("b", 1, 1)] },
    { supplier_id: "f1", supplier_name: "Ana", items: [item("c", 2, 10.5), item("d", 1, 0.1)] },
    { supplier_id: "f3", supplier_name: "Vazio", items: [] },
  ];
  it("ordena por fornecedor, sem fornecedor por último, sem grupos vazios", () => {
    expect(sortQueueGroups(groups).map((g) => g.supplier_name)).toEqual(["Ana", "Zeca", null]);
  });
  it("tudo vem marcado; a seleção guarda só os desmarcados", () => {
    const g = groups[2];
    expect(selectedQueueItems(g, new Set()).map((i) => i.id)).toEqual(["c", "d"]);
    expect(selectedQueueItems(g, toggleId(new Set(), "c")).map((i) => i.id)).toEqual(["d"]);
    expect(queueCost(g.items)).toBe(21.1);
  });
});
