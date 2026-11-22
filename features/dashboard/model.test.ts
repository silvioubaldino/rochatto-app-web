import { describe, expect, it } from "vitest";
import { KPI_LINKS, marginTone, plural, salesLink } from "./model";

describe("indicadores", () => {
  it("o tom da margem: >30 bom, 15–30 atenção, <15 ruim, vazio neutro", () => {
    expect(marginTone(45)).toBe("success");
    expect(marginTone(30)).toBe("warning");
    expect(marginTone(15)).toBe("warning");
    expect(marginTone(14.9)).toBe("danger");
    expect(marginTone(0)).toBe("danger");
    expect(marginTone(null)).toBe("neutral");
  });
  it("plural e links", () => {
    expect(plural(1, "venda", "vendas")).toBe("1 venda");
    expect(plural(3, "venda", "vendas")).toBe("3 vendas");
    expect(salesLink({ from: "2026-11-01", to: "2026-11-22" })).toBe("/vendas?from=2026-11-01&to=2026-11-22");
    expect(KPI_LINKS.payable).toBe("/contas/pagar");
  });
});
