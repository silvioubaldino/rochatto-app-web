import { describe, expect, it } from "vitest";
import { applyFilterPatch, clearPatch, countActiveFilters, parseFilters, withQuery } from "./url-filters-model";

const spec = { status: { default: "OPEN" }, q: {}, from: {}, customer_id: {} };

describe("parseFilters", () => {
  it("lê da URL e cai no padrão", () => {
    expect(parseFilters(spec, new URLSearchParams("q=abc&customer_id=7"))).toEqual({
      status: "OPEN",
      q: "abc",
      from: "",
      customer_id: "7",
    });
  });
});

describe("applyFilterPatch", () => {
  it("aplica o patch e preserva parâmetros que não são filtros (peek, tab)", () => {
    const next = applyFilterPatch(spec, new URLSearchParams("peek=sale:1&tab=x&q=old"), { q: "new" });
    expect(new URLSearchParams(next).get("q")).toBe("new");
    expect(new URLSearchParams(next).get("peek")).toBe("sale:1");
    expect(new URLSearchParams(next).get("tab")).toBe("x");
  });

  it("valor vazio ou igual ao padrão sai da URL", () => {
    expect(applyFilterPatch(spec, new URLSearchParams("q=a&status=WON"), { q: "", status: "OPEN" })).toBe("");
  });
});

describe("countActiveFilters / clearPatch", () => {
  it("conta só o que difere do padrão e aceita ignorar", () => {
    const values = { status: "WON", q: "a", from: "", customer_id: "" };
    expect(countActiveFilters(spec, values)).toBe(2);
    expect(countActiveFilters(spec, values, ["q"])).toBe(1);
  });

  it("clearPatch volta ao padrão, exceto o que se pede para manter", () => {
    expect(clearPatch(spec)).toEqual({ status: "OPEN", q: "", from: "", customer_id: "" });
    expect(clearPatch(spec, ["q"])).toEqual({ status: "OPEN", from: "", customer_id: "" });
  });
});

describe("withQuery", () => {
  it("monta a URL", () => {
    expect(withQuery("/vendas", "a=1")).toBe("/vendas?a=1");
    expect(withQuery("/vendas", "")).toBe("/vendas");
  });
});
