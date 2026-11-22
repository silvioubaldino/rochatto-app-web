// Regras da grade de Items (Quote e Sale): linha, totais, margem e diferença para gravar — puras e testadas.
import type { ItemKind, ItemOrigin, ItemVenda, QuoteItem } from "@/lib/types";

/** Uma linha editável da grade. Serve a Quote (`mode="quote"`) e à Sale (`mode="sale"`). */
export interface ItemLine {
  /** Chave local estável (React); não vai para a api. */
  key: string;
  /** Id gravado na api; ausente = linha nova. */
  id?: string;
  kind: ItemKind;
  productId: string | null;
  serviceId: string | null;
  name: string;
  unit: string | null;
  quantity: number;
  unitPrice: number;
  /** Custo unitário (estimado no Quote; do Item na Sale). */
  unitCost: number;
  // só Sale
  origin?: ItemOrigin | null;
  supplierId?: string | null;
  supplierName?: string | null;
  purchaseId?: string | null;
  stockBalance?: number | null;
}

/** O que o seletor de produto/serviço devolve. */
export interface ItemPick {
  kind: ItemKind;
  id: string | null;
  name: string;
  unit: string | null;
  price: number;
  cost: number;
}

let counter = 0;
export function newKey(): string {
  counter += 1;
  return `line-${counter}`;
}

export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export function pickToLine(pick: ItemPick): ItemLine {
  return {
    key: newKey(),
    kind: pick.kind,
    productId: pick.kind === "PRODUCT" ? pick.id : null,
    serviceId: pick.kind === "SERVICE" ? pick.id : null,
    name: pick.name,
    unit: pick.unit,
    quantity: 0,
    unitPrice: pick.price,
    unitCost: pick.cost,
  };
}

export function fromQuoteItem(i: QuoteItem): ItemLine {
  return {
    key: i.id,
    id: i.id,
    kind: i.kind ?? "PRODUCT",
    productId: i.product_id ?? null,
    serviceId: i.service_id ?? null,
    name: i.product_name,
    unit: null,
    quantity: i.quantity,
    unitPrice: i.unit_price,
    unitCost: i.unit_cost,
  };
}

export function fromSaleItem(i: ItemVenda): ItemLine {
  return {
    key: i.id,
    id: i.id,
    kind: i.kind ?? "PRODUCT",
    productId: i.produto_id ?? null,
    serviceId: i.service_id ?? null,
    name: i.produto_nome,
    unit: null,
    quantity: i.quantidade,
    unitPrice: i.preco_venda_unit,
    unitCost: i.custo_unit,
    origin: i.origin,
    supplierId: i.fornecedor_id ?? null,
    supplierName: i.fornecedor_nome ?? null,
    purchaseId: i.purchase_id,
    stockBalance: i.stock_balance ?? null,
  };
}

export const lineTotal = (l: Pick<ItemLine, "quantity" | "unitPrice">): number => round2(l.quantity * l.unitPrice);
export const lineCost = (l: Pick<ItemLine, "quantity" | "unitCost">): number => round2(l.quantity * l.unitCost);

/** Margem em % do preço: (preço − custo) / preço. `null` sem preço. */
export function marginPercent(revenue: number, cost: number): number | null {
  if (revenue <= 0) return null;
  return round2(((revenue - cost) / revenue) * 100);
}

export const lineMargin = (l: ItemLine): number | null => marginPercent(lineTotal(l), lineCost(l));

export interface GridTotals {
  revenue: number;
  cost: number;
  margin: number | null;
}

export function gridTotals(lines: readonly ItemLine[]): GridTotals {
  const revenue = round2(lines.reduce((s, l) => s + lineTotal(l), 0));
  const cost = round2(lines.reduce((s, l) => s + lineCost(l), 0));
  return { revenue, cost, margin: marginPercent(revenue, cost) };
}

/** Mensagem de erro da linha, ou null. */
export function lineError(l: ItemLine): string | null {
  if (!l.name.trim()) return "Informe o produto ou serviço.";
  if (!(l.quantity > 0)) return "A quantidade deve ser maior que zero.";
  if (l.unitPrice < 0) return "O preço não pode ser negativo.";
  if (l.unitCost < 0) return "O custo não pode ser negativo.";
  return null;
}

/** Linha travada (Item já numa Purchase): só o preço muda (AYD-002 §1). */
export function isLineLocked(l: ItemLine): boolean {
  return !!l.purchaseId;
}

export interface LineDiff {
  create: ItemLine[];
  update: ItemLine[];
  remove: string[];
}

const SAME_FIELDS: (keyof ItemLine)[] = ["name", "quantity", "unitPrice", "unitCost", "productId", "serviceId", "kind"];

/** O que gravar para a lista `drafts` virar o que o servidor tem em `original` (por id). */
export function diffLines(original: readonly ItemLine[], drafts: readonly ItemLine[]): LineDiff {
  const byId = new Map(original.filter((l) => l.id).map((l) => [l.id as string, l]));
  const keptIds = new Set(drafts.filter((l) => l.id).map((l) => l.id as string));
  return {
    create: drafts.filter((l) => !l.id),
    update: drafts.filter((l) => {
      const before = l.id ? byId.get(l.id) : undefined;
      return !!before && SAME_FIELDS.some((f) => before[f] !== l[f]);
    }),
    remove: original.filter((l) => l.id && !keptIds.has(l.id)).map((l) => l.id as string),
  };
}

export function hasChanges(diff: LineDiff): boolean {
  return diff.create.length + diff.update.length + diff.remove.length > 0;
}
