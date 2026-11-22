export function formatMoney(value: number | null | undefined): string {
  const v = typeof value === "number" ? value : Number(value) || 0;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatMoneyPlain(value: number | null | undefined): string {
  const v = typeof value === "number" ? value : Number(value) || 0;
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

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

export function moneyToInput(value: number | null | undefined): string {
  if (!value) return "";
  return String(value).replace(".", ",");
}

export function sumMoney(values: ReadonlyArray<number>): number {
  return values.reduce((acc, v) => acc + Math.round(v * 100), 0) / 100;
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
}
