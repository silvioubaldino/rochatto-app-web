import { describe, expect, it } from "vitest";
import { parseTab, tabQuery } from "./url-tab-model";

const TABS = ["produtos", "servicos", "categorias"] as const;

describe("parseTab", () => {
  it("aceita aba válida e cai no padrão com valor inválido ou ausente", () => {
    expect(parseTab("servicos", TABS, "produtos")).toBe("servicos");
    expect(parseTab("nada", TABS, "produtos")).toBe("produtos");
    expect(parseTab(null, TABS, "produtos")).toBe("produtos");
  });
});

describe("tabQuery", () => {
  it("grava a aba e preserva os outros parâmetros", () => {
    expect(tabQuery("q=a", "tab", "servicos", "produtos")).toBe("q=a&tab=servicos");
  });

  it("a aba padrão sai da URL", () => {
    expect(tabQuery("tab=servicos&q=a", "tab", "produtos", "produtos")).toBe("q=a");
  });
});
