export type DocKind = "Orçamento" | "Venda" | "Compra";

export function docNumber(kind: DocKind, number: number | null | undefined, id?: string): string {
  if (number) return `${kind} nº ${number}`;
  return id ? `${kind} #${id.slice(0, 8)}` : kind;
}

export function docTitle(kind: DocKind, number: number | null | undefined, id: string | undefined, who?: string | null): string {
  const base = docNumber(kind, number, id);
  return who ? `${base} · ${who}` : base;
}
