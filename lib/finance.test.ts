import { describe, expect, it } from "vitest";
import { financePresetPeriod, matchFinancePreset, parseFinancePeriod, validateFinancePeriod } from "./finance";

const TODAY = new Date(2026, 10, 22); // 22/11/2026

describe("período (Indicadores, Resultado e Movimentações)", () => {
  it("o padrão é o mês corrente até hoje", () => {
    expect(parseFinancePeriod(null, null, TODAY)).toEqual({ from: "2026-11-01", to: "2026-11-22" });
  });
  it("datas inválidas caem no padrão; válidas valem", () => {
    expect(parseFinancePeriod("2026-02-30", "lixo", TODAY)).toEqual({ from: "2026-11-01", to: "2026-11-22" });
    expect(parseFinancePeriod("2026-10-01", "2026-10-31", TODAY)).toEqual({ from: "2026-10-01", to: "2026-10-31" });
  });
  it("os atalhos casam com o período exato", () => {
    expect(financePresetPeriod("last_month", TODAY)).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(matchFinancePreset({ from: "2026-10-01", to: "2026-10-31" }, TODAY)).toBe("last_month");
    expect(matchFinancePreset({ from: "2026-10-02", to: "2026-10-31" }, TODAY)).toBeNull();
  });
  it("início depois do fim é erro", () => {
    expect(validateFinancePeriod({ from: "2026-11-10", to: "2026-11-01" })).toMatch(/inicial/);
    expect(validateFinancePeriod({ from: "2026-11-01", to: "2026-11-10" })).toBeNull();
  });
});
