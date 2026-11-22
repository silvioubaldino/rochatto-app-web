/** Dinheiro em pt-BR ("R$ 1.234,56"). Valores inválidos viram 0. */
export function formatMoney(value: number | null | undefined): string {
  const v = typeof value === "number" ? value : Number(value) || 0;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Só o número em pt-BR, sem símbolo ("1.234,56") — para tabelas com a coluna já rotulada. */
export function formatMoneyPlain(value: number | null | undefined): string {
  const v = typeof value === "number" ? value : Number(value) || 0;
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Lê o que o dono digitou num campo de dinheiro ("1.234,56", "1234,5", "12.5", "R$ 10").
 * Aceita vírgula ou ponto decimal; ponto seguido de exatamente 3 dígitos é milhar.
 * Devolve `null` se não houver número.
 */
export function parseMoney(input: string): number | null {
  const cleaned = input.replace(/[^\d.,-]/g, "");
  if (!/\d/.test(cleaned)) return null;
  const negative = cleaned.startsWith("-");
  const digits = cleaned.replace(/-/g, "");
  const lastComma = digits.lastIndexOf(",");
  const lastDot = digits.lastIndexOf(".");
  let normalized: string;
  if (lastComma >= 0) {
    // vírgula decimal; pontos (e outras vírgulas) são milhar
    normalized = `${digits.slice(0, lastComma).replace(/[.,]/g, "")}.${digits.slice(lastComma + 1)}`;
  } else if (lastDot >= 0) {
    const after = digits.length - lastDot - 1;
    const dots = digits.split(".").length - 1;
    // "1.234" ou "1.234.567" = milhar; "12.5" / "12.50" = decimal
    normalized = after === 3 || dots > 1 ? digits.replace(/\./g, "") : digits;
  } else {
    normalized = digits;
  }
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return Math.round((negative ? -n : n) * 100) / 100;
}

/** Texto de um número para edição no campo ("1234,5"; 0 → ""). */
export function moneyToInput(value: number | null | undefined): string {
  if (!value) return "";
  return String(value).replace(".", ",");
}

/** Soma monetária sem erro de ponto flutuante (centavos). */
export function sumMoney(values: ReadonlyArray<number>): number {
  return values.reduce((acc, v) => acc + Math.round(v * 100), 0) / 100;
}

/** Percentual em pt-BR: `formatPercent(38.66)` → "38,7%"; vazio → "—". */
export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
}
