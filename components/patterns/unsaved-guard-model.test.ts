import { describe, expect, it } from "vitest";
import { isInternalNavigationClick } from "./unsaved-guard-model";

const current = { origin: "http://app.test", pathname: "/orcamentos/novo", search: "" };
const click = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false };

describe("isInternalNavigationClick", () => {
  it("link interno para outra rota sai da tela", () => {
    expect(isInternalNavigationClick({ href: "http://app.test/vendas" }, click, current)).toBe(true);
    expect(isInternalNavigationClick({ href: "/vendas?x=1" }, click, current)).toBe(true);
  });

  it("mesma rota (âncora) não sai", () => {
    expect(isInternalNavigationClick({ href: "http://app.test/orcamentos/novo#itens" }, click, current)).toBe(false);
  });

  it("outra origem, nova aba, teclas modificadoras e download não contam", () => {
    expect(isInternalNavigationClick({ href: "https://outro.com/x" }, click, current)).toBe(false);
    expect(isInternalNavigationClick({ href: "/vendas", target: "_blank" }, click, current)).toBe(false);
    expect(isInternalNavigationClick({ href: "/vendas" }, { ...click, ctrlKey: true }, current)).toBe(false);
    expect(isInternalNavigationClick({ href: "/vendas" }, { ...click, metaKey: true }, current)).toBe(false);
    expect(isInternalNavigationClick({ href: "/vendas" }, { ...click, button: 1 }, current)).toBe(false);
    expect(isInternalNavigationClick({ href: "/x.pdf", hasAttribute: (n) => n === "download" }, click, current)).toBe(false);
  });
});
