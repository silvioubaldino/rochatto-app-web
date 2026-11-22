import { describe, expect, it } from "vitest";
import type { SearchGroup } from "@/lib/types";
import { filterActions, moveActive, paletteRows, resultContext, resultRows, resultTitle } from "./model";

const groups: SearchGroup[] = [
  {
    type: "QUOTE",
    items: [
      { id: "q1", number: 154, title: "Alejandra", date: "2026-11-20", amount: 5842, status: "OPEN", city: "Bonito/MS", kind: null },
    ],
  },
  {
    type: "SALE",
    items: [{ id: "s1", number: 154, title: "Alejandra", date: null, amount: null, status: "TO_DELIVER", city: null, kind: null }],
  },
  { type: "CUSTOMER", items: [{ id: "c1", number: null, title: "Alejandra Souza", date: null, amount: null, status: null, city: "Bonito/MS", kind: null }] },
  { type: "SUPPLIER", items: [{ id: "f1", number: null, title: "Matheus RJ", date: null, amount: null, status: null, city: null, kind: "STONE" }] },
];

describe("resultTitle", () => {
  it("usa o número humano nos numerados e o nome nos demais", () => {
    expect(resultTitle("QUOTE", groups[0].items[0])).toBe("Orçamento nº 154 · Alejandra");
    expect(resultTitle("SALE", groups[1].items[0])).toBe("Venda nº 154 · Alejandra");
    expect(resultTitle("CUSTOMER", groups[2].items[0])).toBe("Alejandra Souza");
  });
});

describe("resultContext", () => {
  it("cidade, data, valor e situação com rótulos (nunca o código)", () => {
    const ctx = resultContext("QUOTE", groups[0].items[0]);
    expect(ctx).toContain("Bonito/MS");
    expect(ctx).toContain("20/11/2026");
    expect(ctx).toContain("5.842,00");
    expect(ctx).toContain("Aberto");
    expect(ctx).not.toContain("OPEN");
  });
  it("tipo do fornecedor com rótulo", () => {
    expect(resultContext("SUPPLIER", groups[3].items[0])).toBe("Pedra");
  });
});

describe("resultRows", () => {
  it("aponta para a página e carrega a entidade para a prévia", () => {
    const rows = resultRows(groups);
    expect(rows.map((r) => r.href)).toEqual(["/orcamentos/q1", "/vendas/s1", "/clientes/c1", "/fornecedores/f1"]);
    expect(rows[0].entity).toEqual({ type: "quote", id: "q1" });
  });
});

describe("ações", () => {
  it("sem texto lista as primeiras; com texto filtra sem acento", () => {
    expect(filterActions("")).toHaveLength(5);
    expect(filterActions("DESPESA").map((a) => a.label)).toEqual(["Lançar despesa"]);
    expect(filterActions("orcamento").map((a) => a.label)).toContain("Novo orçamento");
  });
  it("resultados vêm antes das ações", () => {
    const rows = paletteRows("orcamento", groups).map((r) => r.group);
    expect(rows.slice(0, 4)).toEqual(["Orçamentos", "Vendas", "Clientes", "Fornecedores e prestadores"]);
    expect(rows.slice(4).every((g) => g === "Ações")).toBe(true);
    expect(rows.length).toBeGreaterThan(4);
  });
});

describe("moveActive", () => {
  it("dá a volta nas pontas", () => {
    expect(moveActive(0, -1, 3)).toBe(2);
    expect(moveActive(2, 1, 3)).toBe(0);
    expect(moveActive(0, 1, 0)).toBe(0);
  });
});
