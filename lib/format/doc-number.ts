export type DocKind = "Orçamento" | "Venda" | "Compra";

/**
 * Número humano de Quote/Sale/Purchase (AYD-011 C1, UX-P11): "Venda nº 98".
 * Sem `number` (api desencontrada) cai no id curto: "Venda #3f9a12bc" — nunca o UUID inteiro.
 */
export function docNumber(kind: DocKind, number: number | null | undefined, id?: string): string {
  if (number) return `${kind} nº ${number}`;
  return id ? `${kind} #${id.slice(0, 8)}` : kind;
}

/** "Venda nº 98 · Alejandra" — título com a contraparte. */
export function docTitle(kind: DocKind, number: number | null | undefined, id: string | undefined, who?: string | null): string {
  const base = docNumber(kind, number, id);
  return who ? `${base} · ${who}` : base;
}
