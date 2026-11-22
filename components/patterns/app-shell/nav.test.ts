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
    expect(isNavActive({ href: "/hoje", alsoActiveFor: ["/dashboard"] }, "/dashboard")).toBe(true);
  });

  it("a barra inferior é Hoje · Orçamentos · ＋ · Vendas · Mais", () => {
    expect([...BOTTOM_BAR_IDS]).toEqual(["today", "quotes", "new", "sales", "more"]);
    expect(findNavItem("today")?.href).toBe("/dashboard"); // U2 troca por /hoje
  });

  it("Mais fica ativo em rotas que não estão na barra", () => {
    expect(isMoreActive("/compras/1")).toBe(true);
    expect(isMoreActive("/clientes")).toBe(true);
    expect(isMoreActive("/vendas")).toBe(false);
    expect(isMoreActive("/dashboard")).toBe(false);
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
