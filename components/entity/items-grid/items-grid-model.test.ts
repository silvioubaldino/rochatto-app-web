import { describe, expect, it } from "vitest";
import {
  diffLines,
  fromQuoteItem,
  gridTotals,
  hasChanges,
  isLineLocked,
  lineError,
  lineMargin,
  lineTotal,
  marginPercent,
  pickToLine,
  type ItemLine,
} from "./items-grid-model";

const line = (over: Partial<ItemLine> = {}): ItemLine => ({
  key: "k",
  kind: "PRODUCT",
  productId: "p1",
  serviceId: null,
  name: "Rock face",
  unit: "m²",
  quantity: 18,
  unitPrice: 269,
  unitCost: 165,
  ...over,
});

describe("totais e margem", () => {
  it("total da linha e margem por linha (exemplo do T03)", () => {
    expect(lineTotal(line())).toBe(4842);
    expect(lineMargin(line())).toBe(38.66);
    expect(lineMargin(line({ kind: "SERVICE", quantity: 18, unitPrice: 50, unitCost: 30, productId: null }))).toBe(40);
  });
  it("margem sem preço é nula, e preço menor que o custo dá negativa", () => {
    expect(marginPercent(0, 10)).toBeNull();
    expect(marginPercent(100, 130)).toBe(-30);
  });
  it("totais somam linhas e margem geral", () => {
    const t = gridTotals([line(), line({ key: "b", kind: "SERVICE", productId: null, unitPrice: 50, unitCost: 30 })]);
    expect(t.revenue).toBe(5742);
    expect(t.cost).toBe(3510);
    expect(t.margin).toBe(38.87);
  });
  it("sem linhas não há margem", () => {
    expect(gridTotals([])).toEqual({ revenue: 0, cost: 0, margin: null });
  });
});

describe("validação", () => {
  it("nome, quantidade e valores", () => {
    expect(lineError(line())).toBeNull();
    expect(lineError(line({ name: " " }))).toMatch(/produto ou serviço/);
    expect(lineError(line({ quantity: 0 }))).toMatch(/quantidade/);
    expect(lineError(line({ unitPrice: -1 }))).toMatch(/preço/);
  });
  it("Item numa compra fica travado", () => {
    expect(isLineLocked(line({ purchaseId: "c1" }))).toBe(true);
    expect(isLineLocked(line({ purchaseId: null }))).toBe(false);
  });
});

describe("pickToLine / fromQuoteItem", () => {
  it("escolher do catálogo preenche preço e custo de referência; serviço não leva product_id", () => {
    const l = pickToLine({ kind: "SERVICE", id: "s1", name: "Instalação", unit: "m²", price: 50, cost: 30 });
    expect(l).toMatchObject({ kind: "SERVICE", serviceId: "s1", productId: null, unitPrice: 50, unitCost: 30, quantity: 0 });
  });
  it("Item do Quote sem kind é Produto", () => {
    const l = fromQuoteItem({
      id: "i1", quote_id: "q", product_name: "X", quantity: 2, unit_price: 10, unit_cost: 5, total_price: 20, created_at: "",
    });
    expect(l).toMatchObject({ id: "i1", key: "i1", kind: "PRODUCT", productId: null });
  });
});

describe("diffLines", () => {
  const original = [line({ key: "a", id: "a" }), line({ key: "b", id: "b", name: "Moledo" })];
  it("sem mexer não há o que gravar", () => {
    expect(hasChanges(diffLines(original, original.map((l) => ({ ...l }))))).toBe(false);
  });
  it("cria, atualiza e remove por id", () => {
    const drafts = [{ ...original[0], quantity: 20 }, line({ key: "n", name: "Novo" })];
    const d = diffLines(original, drafts);
    expect(d.update.map((l) => l.id)).toEqual(["a"]);
    expect(d.create.map((l) => l.name)).toEqual(["Novo"]);
    expect(d.remove).toEqual(["b"]);
  });
  it("mudar só o fornecedor (não editável aqui) não conta como alteração", () => {
    const d = diffLines(original, [{ ...original[0], supplierId: "f1" }, original[1]]);
    expect(hasChanges(d)).toBe(false);
  });
});
