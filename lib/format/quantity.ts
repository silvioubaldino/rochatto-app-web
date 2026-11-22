/** Quantidade em pt-BR (até 3 casas — `DECIMAL(12,3)`). */
export function formatQuantityNumber(value: number | null | undefined): string {
  const v = typeof value === "number" ? value : Number(value) || 0;
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

/** Quantidade com a unidade do Product/Service: "18 m²"; sem unidade, só o número. */
export function formatQuantity(value: number | null | undefined, unit?: string | null): string {
  const n = formatQuantityNumber(value);
  const u = unit?.trim();
  return u ? `${n} ${u}` : n;
}

/** Lê "18,5" / "18.5" → 18.5; vazio ou inválido → null. */
export function parseQuantity(input: string): number | null {
  const t = input.trim().replace(/\s/g, "");
  if (!t) return null;
  const n = Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
  return Number.isFinite(n) ? n : null;
}
