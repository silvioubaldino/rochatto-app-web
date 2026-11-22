export function formatItemsSummary(
  firstItemName: string | null | undefined,
  itemsCount: number | null | undefined,
): string | null {
  const name = firstItemName?.trim();
  if (!name) return null;
  const extra = (itemsCount ?? 1) - 1;
  return extra > 0 ? `${name} e mais ${extra}` : name;
}

interface QuoteLike {
  first_item_name?: string | null;
  items_count?: number;
  items?: ReadonlyArray<{ product_name: string }>;
}

interface SaleLike {
  first_item_name?: string | null;
  items_count?: number;
  itens?: ReadonlyArray<{ produto_nome: string }>;
}

export function quoteItemsSummary(q: QuoteLike): string | null {
  const fromApi = formatItemsSummary(q.first_item_name, q.items_count);
  if (fromApi) return fromApi;
  return q.items?.length ? formatItemsSummary(q.items[0].product_name, q.items.length) : null;
}

export function saleItemsSummary(s: SaleLike): string | null {
  const fromApi = formatItemsSummary(s.first_item_name, s.items_count);
  if (fromApi) return fromApi;
  return s.itens?.length ? formatItemsSummary(s.itens[0].produto_nome, s.itens.length) : null;
}
