import { beforeEach, describe, expect, it } from "vitest";
import { canGoBackInApp, noteInAppNavigation, resetInAppNavigations } from "./history";

describe("voltar (F08)", () => {
  beforeEach(resetInAppNavigations);

  it("sem navegação dentro do app, volta para a lista (fallback)", () => {
    expect(canGoBackInApp()).toBe(false);
  });

  it("depois de navegar dentro do app, volta pelo histórico", () => {
    noteInAppNavigation();
    expect(canGoBackInApp()).toBe(true);
  });

  it("aceita a contagem explícita (testes de componentes)", () => {
    expect(canGoBackInApp(0)).toBe(false);
    expect(canGoBackInApp(3)).toBe(true);
  });
});
