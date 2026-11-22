import { describe, expect, it } from "vitest";
import { BOTTOM_BAR_IDS, NAV_GROUPS, NEW_MENU, allNavItems, findNavItem, isMoreActive, isNavActive } from "./nav";

describe("navegação", () => {
  it("o item ativo vale para a rota e suas filhas, não para prefixo parcial", () => {
    const sales = findNavItem("sales")!;
    expect(isNavActive(sales, "/vendas")).toBe(true);
    expect(isNavActive(sales, "/vendas/abc")).toBe(true);
    expect(isNavActive(sales, "/vendas-antigas")).toBe(false);
    expect(isNavActive(sales, "/orcamentos")).toBe(false);
  });

  it("alsoActiveFor amplia a rota ativa", () => {
    expect(isNavActive({ href: "/hoje", alsoActiveFor: ["/inicio"] }, "/inicio")).toBe(true);
  });

  it("a barra inferior é Hoje · Orçamentos · ＋ · Vendas · Mais", () => {
    expect([...BOTTOM_BAR_IDS]).toEqual(["today", "quotes", "new", "sales", "more"]);
    expect(findNavItem("today")?.href).toBe("/hoje");
  });

  it("Mais fica ativo em rotas que não estão na barra", () => {
    expect(isMoreActive("/compras/1")).toBe(true);
    expect(isMoreActive("/clientes")).toBe(true);
    expect(isMoreActive("/vendas")).toBe(false);
    expect(isMoreActive("/hoje")).toBe(false);
    expect(isMoreActive("/indicadores")).toBe(true);
  });

  it("ids e hrefs são únicos e todo item está num grupo", () => {
    const items = allNavItems();
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
    expect(new Set(items.map((i) => i.href)).size).toBe(items.length);
    expect(NAV_GROUPS.every((g) => g.items.length > 0)).toBe(true);
  });

  it("menu Novo tem destino ou cadastro rápido em cada entrada", () => {
    for (const e of NEW_MENU) expect(Boolean(e.href) !== Boolean(e.quickCreate)).toBe(true);
  });
});

describe("estrutura do AYD-011 §5.1", () => {
  it("5 grupos com as rotas novas", () => {
    expect(NAV_GROUPS.map((g) => g.id)).toEqual(["home", "commercial", "operations", "finance", "registries"]);
    const hrefs = allNavItems().map((i) => i.href);
    for (const h of [
      "/hoje",
      "/indicadores",
      "/parceiros",
      "/fornecedores",
      "/produtos",
      "/servicos",
      "/contas/receber",
      "/contas/pagar",
    ]) {
      expect(hrefs).toContain(h);
    }
  });

  it("A receber não deixa /contas/pagar ativo", () => {
    expect(isNavActive(findNavItem("receivables")!, "/contas/pagar")).toBe(false);
    expect(isNavActive(findNavItem("payables")!, "/contas/pagar")).toBe(true);
  });

  it("o menu Novo tem Venda rápida, Receber, Pagar e Despesa", () => {
    const ids = NEW_MENU.map((e) => e.id);
    for (const id of ["quote", "quick-sale", "receive", "pay", "expense"]) expect(ids).toContain(id);
  });
});
