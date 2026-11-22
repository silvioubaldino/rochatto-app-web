import { describe, expect, it } from "vitest";
import {
  addDaysISO,
  daysBetween,
  formatDate,
  formatDateTime,
  formatItemsSummary,
  formatMoney,
  formatMoneyPlain,
  formatQuantity,
  formatRelativeDays,
  isPastDue,
  moneyToInput,
  parseMoney,
  parseQuantity,
  quoteItemsSummary,
  saleItemsSummary,
  sumMoney,
  QUOTE_STATUS_COLORS,
  formatMoeda,
  formatData,
} from "./index";

// Intl usa espaço não separável entre "R$" e o número.
const nbsp = (s: string) => s.replace(/\s/g, " ");

describe("money", () => {
  it("formata em pt-BR", () => {
    expect(nbsp(formatMoney(1234.5))).toBe("R$ 1.234,50");
    expect(nbsp(formatMoney(-10))).toBe("-R$ 10,00");
    expect(nbsp(formatMoney(null))).toBe("R$ 0,00");
    expect(nbsp(formatMoeda(2))).toBe("R$ 2,00"); // nome legado
  });

  it("formata sem símbolo", () => {
    expect(formatMoneyPlain(1234.5)).toBe("1.234,50");
  });

  it.each([
    ["1.234,56", 1234.56],
    ["1234,5", 1234.5],
    ["12.5", 12.5],
    ["12.50", 12.5],
    ["1.234", 1234],
    ["1.234.567", 1234567],
    ["R$ 10", 10],
    ["-3,5", -3.5],
    ["0,1", 0.1],
  ])("parseMoney(%s) = %s", (input, expected) => {
    expect(parseMoney(input)).toBe(expected);
  });

  it("parseMoney devolve null sem número", () => {
    expect(parseMoney("")).toBeNull();
    expect(parseMoney("abc")).toBeNull();
    expect(parseMoney("-")).toBeNull();
  });

  it("moneyToInput usa vírgula e esconde zero", () => {
    expect(moneyToInput(1234.5)).toBe("1234,5");
    expect(moneyToInput(0)).toBe("");
  });

  it("sumMoney não acumula erro de ponto flutuante", () => {
    expect(sumMoney([0.1, 0.2])).toBe(0.3);
  });
});

describe("date", () => {
  it("formata datas ISO", () => {
    expect(formatDate("2026-11-22")).toBe("22/11/2026");
    expect(formatData("2026-11-22")).toBe("22/11/2026");
    expect(formatDateTime("2026-11-22T13:05:00")).toBe("22/11/2026 13:05");
  });

  it("soma dias e mede diferença", () => {
    expect(addDaysISO("2026-11-28", 7)).toBe("2026-12-05");
    expect(daysBetween("2026-11-22", "2026-11-29")).toBe(7);
    expect(daysBetween("2026-11-22", "2026-11-20")).toBe(-2);
  });

  it("vencido é estritamente antes de hoje", () => {
    expect(isPastDue("2026-11-21", "2026-11-22")).toBe(true);
    expect(isPastDue("2026-11-22", "2026-11-22")).toBe(false);
    expect(isPastDue(null, "2026-11-22")).toBe(false);
  });

  it("relativo em português", () => {
    expect(formatRelativeDays("2026-11-22", "2026-11-22")).toBe("hoje");
    expect(formatRelativeDays("2026-11-23", "2026-11-22")).toBe("amanhã");
    expect(formatRelativeDays("2026-11-21", "2026-11-22")).toBe("ontem");
    expect(formatRelativeDays("2026-11-25", "2026-11-22")).toBe("em 3 dias");
    expect(formatRelativeDays("2026-11-10", "2026-11-22")).toBe("há 12 dias");
  });
});

describe("quantity", () => {
  it("junta a unidade", () => {
    expect(formatQuantity(18, "m²")).toBe("18 m²");
    expect(formatQuantity(18.5)).toBe("18,5");
    expect(formatQuantity(1.23456, " m² ")).toBe("1,235 m²");
  });

  it("lê quantidade digitada", () => {
    expect(parseQuantity("18,5")).toBe(18.5);
    expect(parseQuantity("1.000,5")).toBe(1000.5);
    expect(parseQuantity("")).toBeNull();
    expect(parseQuantity("x")).toBeNull();
  });
});

describe("resumo de Items (C3)", () => {
  it("usa first_item_name e items_count", () => {
    expect(formatItemsSummary("Rock face", 3)).toBe("Rock face e mais 2");
    expect(formatItemsSummary("Rock face", 1)).toBe("Rock face");
    expect(formatItemsSummary("Rock face", undefined)).toBe("Rock face");
    expect(formatItemsSummary(null, 3)).toBeNull();
  });

  it("cai nos itens carregados quando a api ainda não manda o resumo", () => {
    expect(quoteItemsSummary({ items: [{ product_name: "A" }, { product_name: "B" }] })).toBe("A e mais 1");
    expect(saleItemsSummary({ itens: [{ produto_nome: "A" }] })).toBe("A");
    expect(quoteItemsSummary({})).toBeNull();
    expect(saleItemsSummary({ first_item_name: "Moledo", items_count: 2 })).toBe("Moledo e mais 1");
  });
});

describe("mapas legados derivados dos tons", () => {
  it("QUOTE_STATUS_COLORS usa tokens semânticos, não cores cruas", () => {
    expect(QUOTE_STATUS_COLORS.WON).toBe("bg-success-subtle text-success");
    expect(QUOTE_STATUS_COLORS.LOST).toBe("bg-danger-subtle text-danger");
  });
});
