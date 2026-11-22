import { describe, expect, it } from "vitest";
import type { ItemLine } from "@/components/entity/items-grid";
import type { ItemVenda, Venda } from "@/lib/types";
import { chipOf, chipPatch, attendanceView, cancelBlockedReason, chipFilters, isLate, lockReasonFor, nextStep, type PurchaseInfo, type SaleStepContext } from "./model";

const TODAY = "2026-11-22";
const item = (over: Partial<ItemVenda> = {}): ItemVenda => ({
  id: "i1", venda_id: "s", produto_id: "p", produto_nome: "Rock", quantidade: 1, preco_venda_unit: 10, custo_unit: 5,
  total_venda: 10, total_custo: 5, origin: "MADE_TO_ORDER", purchase_id: null, fornecedor_id: "f1", fornecedor_nome: "Matheus RJ", ...over,
});
const sale = (over: Partial<Venda> = {}): Venda => ({
  id: "s", cliente_id: "c", cliente_nome: "A", delivery_status: "TO_DELIVER", payment_status: "PENDING", data_venda: TODAY,
  total_venda: 10, total_custo: 5, total_recebido: 0, a_receber: 10, receivable: 10, lucro: 5, itens: [item({ purchase_id: "pu1" })], created_at: "", ...over,
});
const purchase = (status: PurchaseInfo["status"]): PurchaseInfo => ({ id: "pu1", number: 12, status, supplier_id: "f1", expected_date: "2026-11-20" });
const ctx = (over: Partial<SaleStepContext> = {}): SaleStepContext => ({
  today: TODAY, purchases: { pu1: purchase("RECEIVED") },
  receivable: { open: 10, overdue: false, due_date: "2026-12-01", next_installment: { due_date: "2026-12-01", amount_open: 10 } }, ...over,
});

describe("nextStep(sale) — ordem do AYD-011 T06", () => {
  it("1 · Item sob encomenda sem fornecedor → Definir atendimento", () => {
    const s = sale({ itens: [item({ fornecedor_id: undefined, fornecedor_nome: undefined })] });
    expect(nextStep(s, ctx())?.id).toBe("define-fulfillment");
  });
  it("2 · com fornecedor e fora de compra → Gerar compra (uma por fornecedor)", () => {
    const one = nextStep(sale({ itens: [item()] }), ctx());
    expect(one).toMatchObject({ id: "generate-purchase", label: "Gerar compra", supplierIds: ["f1"] });
    const two = nextStep(sale({ itens: [item(), item({ id: "i2", fornecedor_id: "f2" })] }), ctx());
    expect(two?.supplierIds).toEqual(["f1", "f2"]);
    expect(two?.label).toBe("Gerar compras");
  });
  it("3 · conta sem plano → Definir recebimento", () => {
    const r = { open: 10, overdue: false, due_date: null, next_installment: null };
    expect(nextStep(sale(), ctx({ receivable: r }))?.id).toBe("define-plan");
  });
  it("4 · parcela vencida → Receber (valor vencido)", () => {
    const r = { open: 10, overdue: true, due_date: "2026-11-01", next_installment: { due_date: "2026-11-01", amount_open: 4 } };
    const step = nextStep(sale(), ctx({ receivable: r }));
    expect(step).toMatchObject({ id: "receive-overdue", tone: "danger" });
    expect(step?.description).toMatch(/4,00/);
  });
  it("5 · prazo chegou e compras recebidas → Marcar entregue", () => {
    const s = sale({ data_entrega_prevista: "2026-11-22" });
    expect(nextStep(s, ctx())?.id).toBe("deliver");
    expect(nextStep(s, ctx({ purchases: { pu1: purchase("ORDERED") } }))?.id).toBe("receive");
  });
  it("5 · só estoque ou serviço também entrega no prazo", () => {
    const s = sale({ data_entrega_prevista: "2026-11-21", itens: [item({ origin: "FROM_STOCK", purchase_id: null, fornecedor_id: undefined })] });
    expect(nextStep(s, ctx())?.id).toBe("deliver");
  });
  it("6 · custo sem credor → Definir credor", () => {
    const s = sale({ composition: { items_total: 10, charges: [], charges_total: 0, price_total: 10, costs_total: 5, costs: [{ id: "k", sale_id: "s", kind: "FREIGHT", amount: 5, description: null, payee: null, sale_item_id: null, obligation_id: null }] } });
    expect(nextStep(s, ctx())?.id).toBe("define-payee");
  });
  it("7 · saldo a receber → Receber; nada pendente → sem banner", () => {
    expect(nextStep(sale(), ctx())?.id).toBe("receive");
    expect(nextStep(sale(), ctx({ receivable: null }))).toBeNull();
  });
  it("venda cancelada não tem próximo passo", () => {
    expect(nextStep(sale({ delivery_status: "CANCELED", itens: [item({ fornecedor_id: undefined })] }), ctx())).toBeNull();
  });
});

const line = (over: Partial<ItemLine> = {}): ItemLine => ({
  key: "k", kind: "PRODUCT", productId: "p", serviceId: null, name: "Rock", unit: "m²", quantity: 1, unitPrice: 1, unitCost: 1,
  origin: "MADE_TO_ORDER", supplierId: "f1", supplierName: "Matheus RJ", purchaseId: null, ...over,
});

describe("attendanceView", () => {
  const p = { pu1: purchase("ORDERED") };
  it("a comprar", () => expect(attendanceView(line(), p).text).toBe("Sob encomenda · Matheus RJ · a comprar"));
  it("em compra, com número, situação e previsão", () => {
    expect(attendanceView(line({ purchaseId: "pu1" }), p).text).toBe("Sob encomenda · Matheus RJ · Compra nº 12 · Pedida · prev. 20/11/2026");
  });
  it("sem fornecedor chama atenção", () => {
    expect(attendanceView(line({ supplierId: null }), p)).toMatchObject({ text: "Sob encomenda · definir fornecedor", tone: "warning" });
  });
  it("do estoque com saldo atual e aviso se negativo (C7)", () => {
    expect(attendanceView(line({ origin: "FROM_STOCK", stockBalance: -2 }), p)).toMatchObject({ text: expect.stringContaining("saldo atual -2 m² ⚠"), tone: "warning" });
    expect(attendanceView(line({ origin: "FROM_STOCK", stockBalance: 25 }), p).tone).toBeUndefined();
  });
  it("serviço", () => expect(attendanceView(line({ kind: "SERVICE" }), p).text).toBe("Serviço"));
});

describe("travas e cancelamento (RN-15)", () => {
  it("explica a trava antes de editar", () => {
    expect(lockReasonFor(line({ purchaseId: "pu1" }), { pu1: purchase("RECEIVED") })).toBe("Item na Compra nº 12 (recebida): só o preço muda.");
    expect(lockReasonFor(line(), {})).toBeNull();
  });
  it("cancelar é bloqueado com Item em compra pedida/recebida; aberta libera", () => {
    const s = sale();
    expect(cancelBlockedReason(s, { pu1: purchase("ORDERED") })).toMatch(/não dá para cancelar/);
    expect(cancelBlockedReason(s, { pu1: purchase("OPEN") })).toBeNull();
  });
});

describe("chips (T07)", () => {
  it("cada chip vira filtros", () => {
    expect(chipFilters("late")).toEqual({ delivery_status: "TO_DELIVER", late: true });
    expect(chipFilters("receivable")).toEqual({ payment_status: "PENDING,PARTIAL" });
    expect(chipFilters("")).toEqual({});
  });
  it("atrasada = a entregar com prazo antes de hoje", () => {
    expect(isLate({ delivery_status: "TO_DELIVER", data_entrega_prevista: "2026-11-21" }, TODAY)).toBe(true);
    expect(isLate({ delivery_status: "TO_DELIVER", data_entrega_prevista: "2026-11-22" }, TODAY)).toBe(false);
    expect(isLate({ delivery_status: "DELIVERED", data_entrega_prevista: "2026-11-01" }, TODAY)).toBe(false);
  });
});

describe("chipOf / chipPatch", () => {
  const none = { delivery_status: "", payment_status: "", late: "" };
  it("ida e volta", () => {
    for (const chip of ["", "to-deliver", "late", "receivable"] as const) expect(chipOf(chipPatch(chip))).toBe(chip);
  });
  it("combinação de um painel não acende chip", () => {
    expect(chipOf({ ...none, payment_status: "PAID" })).toBe("custom");
    expect(chipOf({ ...none, delivery_status: "DELIVERED" })).toBe("custom");
  });
});
