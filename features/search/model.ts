import { formatDate, formatMoney, PARTNER_TYPE_LABELS, statusMeta, SUPPLIER_KIND_LABELS } from "@/lib/format";
import { normalizeText, entityHref, type EntityType } from "@/components/entity/entity-model";
import type { PartnerType, SearchGroup, SearchItem, SearchType, SupplierKind } from "@/lib/types";

export const SEARCH_TYPE_LABELS: Record<SearchType, string> = {
  CUSTOMER: "Clientes",
  QUOTE: "Orçamentos",
  SALE: "Vendas",
  PURCHASE: "Compras",
  PRODUCT: "Produtos",
  SERVICE: "Serviços",
  SUPPLIER: "Fornecedores e prestadores",
  PARTNER: "Parceiros",
};

const ENTITY_BY_TYPE: Record<SearchType, EntityType> = {
  CUSTOMER: "customer",
  QUOTE: "quote",
  SALE: "sale",
  PURCHASE: "purchase",
  PRODUCT: "product",
  SERVICE: "service",
  SUPPLIER: "supplier",
  PARTNER: "partner",
};

const NUMBERED: Partial<Record<SearchType, string>> = { QUOTE: "Orçamento", SALE: "Venda", PURCHASE: "Compra" };

export function resultTitle(type: SearchType, item: SearchItem): string {
  const noun = NUMBERED[type];
  return noun && item.number ? `${noun} nº ${item.number} · ${item.title}` : item.title;
}

export function resultContext(type: SearchType, item: SearchItem): string {
  const parts: string[] = [];
  if (item.city) parts.push(item.city);
  if (item.date) parts.push(formatDate(item.date));
  if (item.amount !== null) parts.push(formatMoney(item.amount));
  if (item.status) {
    const kind = type === "QUOTE" ? "quote" : type === "SALE" ? "saleDelivery" : type === "PURCHASE" ? "purchase" : null;
    if (kind) parts.push(statusMeta(kind, item.status).label);
  }
  if (item.kind) {
    if (type === "SUPPLIER") parts.push(SUPPLIER_KIND_LABELS[item.kind as SupplierKind] ?? item.kind);
    else if (type === "PARTNER") parts.push(PARTNER_TYPE_LABELS[item.kind as PartnerType] ?? item.kind);
    else if (type === "PRODUCT") parts.push(item.kind);
  }
  return parts.join(" · ");
}

export interface PaletteRow {
  key: string;
  group: string;
  label: string;
  context: string;
  href: string;
  entity?: { type: EntityType; id: string };
}

export function resultRows(groups: readonly SearchGroup[]): PaletteRow[] {
  return groups.flatMap((g) =>
    g.items.map((item) => ({
      key: `${g.type}:${item.id}`,
      group: SEARCH_TYPE_LABELS[g.type],
      label: resultTitle(g.type, item),
      context: resultContext(g.type, item),
      href: entityHref(ENTITY_BY_TYPE[g.type], item.id),
      entity: { type: ENTITY_BY_TYPE[g.type], id: item.id },
    })),
  );
}

interface PaletteAction {
  id: string;
  label: string;
  href: string;
  keywords: string;
}

export const PALETTE_ACTIONS: readonly PaletteAction[] = [
  { id: "new-quote", label: "Novo orçamento", href: "/orcamentos/novo", keywords: "criar orcamento novo" },
  { id: "quick-sale", label: "Venda rápida", href: "/orcamentos/novo?rapida=1", keywords: "criar venda rapida fechar" },
  { id: "receive", label: "Receber de…", href: "/contas/receber", keywords: "receber recebimento a receber cliente" },
  { id: "pay", label: "Pagar…", href: "/contas/pagar", keywords: "pagar pagamento a pagar fornecedor" },
  { id: "expense", label: "Lançar despesa", href: "/movimentacoes?nova=despesa", keywords: "despesa gasto combustivel lancar" },
  { id: "go-today", label: "Ir para Hoje", href: "/hoje", keywords: "hoje pendencias inicio" },
  { id: "go-payable", label: "Ir para A pagar", href: "/contas/pagar", keywords: "a pagar contas" },
  { id: "go-receivable", label: "Ir para A receber", href: "/contas/receber", keywords: "a receber contas" },
  { id: "go-sales", label: "Ir para Vendas", href: "/vendas", keywords: "vendas" },
  { id: "go-quotes", label: "Ir para Orçamentos", href: "/orcamentos", keywords: "orcamentos" },
];

export function filterActions(query: string, limit = 5): PaletteRow[] {
  const q = normalizeText(query);
  return PALETTE_ACTIONS.filter((a) => !q || normalizeText(`${a.label} ${a.keywords}`).includes(q))
    .slice(0, limit)
    .map((a) => ({ key: `action:${a.id}`, group: "Ações", label: a.label, context: "", href: a.href }));
}

export function paletteRows(query: string, groups: readonly SearchGroup[]): PaletteRow[] {
  return [...resultRows(groups), ...filterActions(query)];
}

export function moveActive(current: number, delta: number, length: number): number {
  if (length <= 0) return 0;
  return (current + delta + length) % length;
}
