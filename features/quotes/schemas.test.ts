import { describe, expect, it } from "vitest";
import type { ItemLine } from "@/components/entity/items-grid";
import { emptyQuoteForm, quoteFormSchema, toQuoteChargesPayload, toQuoteCreatePayload, toQuoteItemPayload } from "./schemas";

const product: ItemLine = {
  key: "a", kind: "PRODUCT", productId: "p1", serviceId: null, name: " Rock face ", unit: "m²",
  quantity: 18, unitPrice: 269, unitCost: 165,
};
const service: ItemLine = { ...product, key: "b", kind: "SERVICE", productId: null, serviceId: "s1", name: "Instalação" };

describe("quoteFormSchema", () => {
  it("exige cliente, data e ao menos um item", () => {
    const r = quoteFormSchema.safeParse(emptyQuoteForm("2026-11-22"));
    expect(r.success).toBe(false);
    const msgs = r.error?.issues.map((i) => i.message) ?? [];
    expect(msgs).toContain("Cliente é obrigatório");
    expect(msgs).toContain("Adicione pelo menos um item");
  });
  it("valida a linha: quantidade maior que zero", () => {
    const r = quoteFormSchema.safeParse({ ...emptyQuoteForm("2026-11-22", "c1"), items: [{ ...product, quantity: 0 }] });
    expect(r.error?.issues[0].message).toMatch(/quantidade/);
  });
  it("formulário válido passa", () => {
    expect(quoteFormSchema.safeParse({ ...emptyQuoteForm("2026-11-22", "c1"), items: [product] }).success).toBe(true);
  });
});

describe("montadores de payload", () => {
  it("Item de serviço não leva product_id; produto não leva service_id; nome sem espaços", () => {
    expect(toQuoteItemPayload(product)).toMatchObject({ product_id: "p1", service_id: null, product_name: "Rock face" });
    expect(toQuoteItemPayload(service)).toMatchObject({ product_id: null, service_id: "s1", kind: "SERVICE" });
  });
  it("cobranças zeradas saem; id mantém a linha; descrição vazia vira null", () => {
    expect(
      toQuoteChargesPayload([
        { id: "c1", kind: "FREIGHT", amount: 100, description: " " },
        { kind: "OTHER", amount: 0, description: "x" },
      ]),
    ).toEqual([{ id: "c1", kind: "FREIGHT", amount: 100, description: null }]);
  });
  it('referrer_id "" vira null (a api rejeita string vazia)', () => {
    const p = toQuoteCreatePayload({ ...emptyQuoteForm("2026-11-22", "c1"), items: [product] });
    expect(p.referrer_id).toBeNull();
    expect(p.notes).toBeNull();
    expect(p.items).toHaveLength(1);
  });
});
