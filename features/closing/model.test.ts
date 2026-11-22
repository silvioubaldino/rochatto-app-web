import { describe, expect, it } from "vitest";
import { initialPlanState } from "@/components/entity/installment-plan";
import {
  buildClosing,
  closingErrorTarget,
  closingTotals,
  defaultItemState,
  effectiveSupplier,
  stockShortfall,
  validateClosing,
  type ClosingItem,
  type ClosingState,
} from "./model";

const TODAY = "2026-11-22";
const rock: ClosingItem = { ref: { quoteItemId: "i1" }, kind: "PRODUCT", productId: "p1", name: "Rock face", unit: "m²", quantity: 18, unitPrice: 269, unitCost: 165 };
const moledo: ClosingItem = { ref: { quoteItemId: "i2" }, kind: "PRODUCT", productId: "p2", name: "Moledo", unit: "m²", quantity: 10, unitPrice: 100, unitCost: 60 };
const install: ClosingItem = { ref: { quoteItemId: "i3" }, kind: "SERVICE", productId: null, name: "Instalação", unit: "m²", quantity: 18, unitPrice: 50, unitCost: 30 };
const items = [rock, moledo, install];
const NO_DEFAULTS = new Map<string, string>();

const state = (over: Partial<ClosingState> = {}): ClosingState => ({
  items: items.map(() => defaultItemState()),
  deliveryDate: "",
  plan: initialPlanState(TODAY),
  receivedNow: false,
  method: "",
  costs: [],
  ...over,
});

describe("fornecedor habitual (C8)", () => {
  it("vale o habitual enquanto o dono não mexeu; o que ele escolher (mesmo vazio) vence", () => {
    const defaults = new Map([["p1", "f9"]]);
    expect(effectiveSupplier(defaultItemState(), rock, defaults)).toBe("f9");
    expect(effectiveSupplier({ ...defaultItemState(), supplierId: "f2" }, rock, defaults)).toBe("f2");
    expect(effectiveSupplier({ ...defaultItemState(), supplierId: "" }, rock, defaults)).toBe("");
    expect(effectiveSupplier(defaultItemState(), moledo, defaults)).toBe("");
  });
});

describe("saldo", () => {
  it("avisa quanto falta, sem bloquear", () => {
    expect(stockShortfall(4, 10)).toBe(6);
    expect(stockShortfall(25, 18)).toBe(0);
    expect(stockShortfall(undefined, 18)).toBe(0);
    expect(stockShortfall(-2, 3)).toBe(5);
  });
});

describe("lucro previsto ao vivo", () => {
  it("preço − custos dos Items − custos previstos", () => {
    const t = closingTotals(items, 100, [{ key: "c", kind: "FREIGHT", amount: 150, payeeId: "", description: "" }]);
    expect(t).toMatchObject({ price: 6842, itemsCost: 4110, extraCosts: 150, profit: 2582 });
    expect(t.margin).toBe(37.74);
  });
  it("sem preço não há margem", () => {
    expect(closingTotals([], 0, []).margin).toBeNull();
  });
});

describe("buildClosing (C5)", () => {
  it("fechar sem tocar em nada: Items sob encomenda, plano 50/50, sem entrada paga", () => {
    const c = buildClosing(items, state(), 6842, TODAY, NO_DEFAULTS);
    expect(c.items).toEqual([
      { quote_item_id: "i1", origin: "MADE_TO_ORDER" },
      { quote_item_id: "i2", origin: "MADE_TO_ORDER" },
      { quote_item_id: "i3" },
    ]);
    expect(c.receivable_plan?.installments).toEqual([
      { due_date: TODAY, amount: 3421 },
      { due_date: "2026-11-29", amount: 3421 },
    ]);
    expect(c.down_payment).toBeUndefined();
    expect(c.costs).toBeUndefined();
    expect(c.delivery_due_date).toBeUndefined();
  });

  it("TO-2: sob encomenda do fornecedor X, estoque, instalador Y, entrada Pix, frete pago ao motorista", () => {
    const s = state({
      items: [
        { ...defaultItemState(), supplierId: "fX" },
        { ...defaultItemState(), origin: "FROM_STOCK" },
        { ...defaultItemState(), laborPayeeId: "fY" },
      ],
      deliveryDate: "2026-11-29",
      receivedNow: true,
      method: "PIX",
      costs: [{ key: "c", kind: "FREIGHT", amount: 150, payeeId: "fM", description: " " }],
    });
    const c = buildClosing(items, s, 6842, TODAY, NO_DEFAULTS);
    expect(c.items).toEqual([
      { quote_item_id: "i1", origin: "MADE_TO_ORDER", supplier_id: "fX" },
      { quote_item_id: "i2", origin: "FROM_STOCK" },
      { quote_item_id: "i3", labor_payee_id: "fY" },
    ]);
    expect(c.delivery_due_date).toBe("2026-11-29");
    expect(c.down_payment).toEqual({ amount: 3421, occurred_on: TODAY, payment_method: "PIX" });
    expect(c.costs).toEqual([{ kind: "FREIGHT", amount: 150, payee_id: "fM", description: null }]);
  });

  it("estoque nunca leva fornecedor, mesmo com habitual", () => {
    const s = state({ items: [{ ...defaultItemState(), origin: "FROM_STOCK" }, defaultItemState(), defaultItemState()] });
    const c = buildClosing(items, s, 100, TODAY, new Map([["p1", "f9"]]));
    expect(c.items?.[0]).toEqual({ quote_item_id: "i1", origin: "FROM_STOCK" });
  });

  it("fornecedor habitual pré-preenche o Item não mexido", () => {
    const c = buildClosing(items, state(), 100, TODAY, new Map([["p1", "f9"]]));
    expect(c.items?.[0]).toEqual({ quote_item_id: "i1", origin: "MADE_TO_ORDER", supplier_id: "f9" });
  });

  it("venda rápida aponta os Items por índice", () => {
    const quick = items.map((it, index) => ({ ...it, ref: { index } }));
    const c = buildClosing(quick, state(), 100, TODAY, NO_DEFAULTS);
    expect(c.items?.map((i) => i.item_index)).toEqual([0, 1, 2]);
    expect(c.items?.[0]).not.toHaveProperty("quote_item_id");
  });

  it("definir depois não envia plano nem entrada", () => {
    const s = state({ plan: { ...initialPlanState(TODAY), preset: "later" }, receivedNow: true, method: "PIX" });
    const c = buildClosing(items, s, 100, TODAY, NO_DEFAULTS);
    expect(c.receivable_plan).toBeUndefined();
    expect(c.down_payment).toBeUndefined();
  });

  it("custos zerados não são enviados", () => {
    const s = state({ costs: [{ key: "c", kind: "OTHER", amount: 0, payeeId: "", description: "" }] });
    expect(buildClosing(items, s, 100, TODAY, NO_DEFAULTS).costs).toBeUndefined();
  });
});

describe("validateClosing", () => {
  it("entrada recebida pede forma de pagamento e plano", () => {
    expect(validateClosing(state({ receivedNow: true }), 100, TODAY)).toMatchObject({ section: "receivable", message: /forma de pagamento/ });
    const later = state({ plan: { ...initialPlanState(TODAY), preset: "later" }, receivedNow: true });
    expect(validateClosing(later, 100, TODAY)?.message).toMatch(/plano/);
  });
  it("sem nada de errado, passa", () => {
    expect(validateClosing(state(), 100, TODAY)).toBeNull();
    expect(validateClosing(state({ receivedNow: true, method: "PIX" }), 100, TODAY)).toBeNull();
  });
});

describe("closingErrorTarget", () => {
  it("mapeia o campo da api para a seção e a linha", () => {
    expect(closingErrorTarget("closing.items[1].supplier_id")).toEqual({ section: "items", index: 1 });
    expect(closingErrorTarget("closing.costs[0].payee_id")).toEqual({ section: "costs", index: 0 });
    expect(closingErrorTarget("closing.receivable_plan")).toEqual({ section: "receivable" });
    expect(closingErrorTarget("closing.down_payment.payment_method")).toEqual({ section: "receivable" });
    expect(closingErrorTarget("closing.delivery_due_date")).toEqual({ section: "delivery" });
    expect(closingErrorTarget("customer_id")).toBeNull();
    expect(closingErrorTarget(undefined)).toBeNull();
  });
});
