import { addDaysISO, formatDate, formatMoney } from "@/lib/format";
import type { PendingActionGroup, PendingActionItem, PendingActionKind } from "@/lib/types";

export const HORIZON_OPTIONS = [
  { value: "0", label: "Hoje" },
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
] as const;

export const DEFAULT_HORIZON = "7";

export function parseHorizon(raw: string | null | undefined): number {
  const n = Number(raw ?? DEFAULT_HORIZON);
  return Number.isInteger(n) && n >= 0 && n <= 60 ? n : Number(DEFAULT_HORIZON);
}

export interface HomeSection {
  id: "money" | "operations" | "commercial";
  label: string;
  kinds: readonly PendingActionKind[];
}

export const HOME_SECTIONS: readonly HomeSection[] = [
  { id: "money", label: "Dinheiro", kinds: ["RECEIVABLE_DUE", "PAYABLE_DUE", "RECEIVABLE_WITHOUT_PLAN", "COST_WITHOUT_PAYEE"] },
  {
    id: "operations",
    label: "Operação",
    kinds: ["DELIVERY_DUE", "ITEMS_WITHOUT_SUPPLIER", "ITEMS_TO_PURCHASE", "PURCHASE_TO_ORDER", "PURCHASE_TO_RECEIVE"],
  },
  { id: "commercial", label: "Comercial", kinds: ["QUOTE_STALE", "NEGATIVE_STOCK"] },
];

export function buildSections(groups: readonly PendingActionGroup[]): { section: HomeSection; groups: PendingActionGroup[] }[] {
  return HOME_SECTIONS.map((section) => ({
    section,
    groups: groups.filter((g) => section.kinds.includes(g.kind)),
  })).filter((s) => s.groups.length > 0);
}

const BASE_TITLES: Record<PendingActionKind, string> = {
  RECEIVABLE_DUE: "A receber",
  PAYABLE_DUE: "A pagar",
  DELIVERY_DUE: "Entregas",
  ITEMS_WITHOUT_SUPPLIER: "Items sem fornecedor",
  ITEMS_TO_PURCHASE: "A comprar",
  PURCHASE_TO_ORDER: "Compras a pedir",
  PURCHASE_TO_RECEIVE: "Compras a receber",
  RECEIVABLE_WITHOUT_PLAN: "Contas sem plano",
  COST_WITHOUT_PAYEE: "Custos sem credor",
  QUOTE_STALE: "Orçamentos parados (+7 dias)",
  NEGATIVE_STOCK: "Estoque negativo",
};

const HORIZON_KINDS: readonly PendingActionKind[] = ["RECEIVABLE_DUE", "PAYABLE_DUE", "DELIVERY_DUE", "PURCHASE_TO_RECEIVE"];

export function groupTitle(kind: PendingActionKind, today: string, horizonDays: number): string {
  const base = BASE_TITLES[kind];
  if (!HORIZON_KINDS.includes(kind)) return base;
  return horizonDays === 0 ? `${base} hoje` : `${base} até ${formatDate(addDaysISO(today, horizonDays))}`;
}

export function groupSummary(group: Pick<PendingActionGroup, "count" | "amount">): string {
  return group.amount !== null && group.amount !== 0
    ? `${formatMoney(group.amount)} · ${group.count}`
    : String(group.count);
}

export type RowActionId =
  | "settle"
  | "deliver"
  | "define-supplier"
  | "generate-purchase"
  | "mark-ordered"
  | "mark-received"
  | "link";

export interface RowAction {
  id: RowActionId;
  label: string;
  href?: string;
}

export function itemHref(kind: PendingActionKind, item: PendingActionItem): string {
  const { type, id } = item.entity;
  switch (type) {
    case "SALE":
      return `/vendas/${id}`;
    case "QUOTE":
      return `/orcamentos/${id}`;
    case "PURCHASE":
      return `/compras/${id}`;
    case "OBLIGATION":
      return `/contas/${id}`;
    case "PRODUCT":
      return "/estoque";
    case "SUPPLIER":
      return kind === "ITEMS_TO_PURCHASE" ? "/compras?tab=a-comprar" : "/fornecedores";
  }
}

export function rowAction(kind: PendingActionKind, item: PendingActionItem): RowAction {
  switch (kind) {
    case "RECEIVABLE_DUE":
      return { id: "settle", label: "Receber" };
    case "PAYABLE_DUE":
      return { id: "settle", label: "Pagar" };
    case "DELIVERY_DUE":
      return { id: "deliver", label: "Marcar entregue" };
    case "ITEMS_WITHOUT_SUPPLIER":
      return { id: "define-supplier", label: "Definir fornecedor", href: `/vendas/${item.entity.id}?atendimento=1` };
    case "ITEMS_TO_PURCHASE":
      return { id: "generate-purchase", label: "Gerar compra" };
    case "PURCHASE_TO_ORDER":
      return { id: "mark-ordered", label: "Marcar pedida" };
    case "PURCHASE_TO_RECEIVE":
      return { id: "mark-received", label: "Marcar recebida" };
    case "RECEIVABLE_WITHOUT_PLAN":
      return { id: "link", label: "Definir plano", href: itemHref(kind, item) };
    case "COST_WITHOUT_PAYEE":
      return { id: "link", label: "Definir credor", href: itemHref(kind, item) };
    case "QUOTE_STALE":
      return { id: "link", label: "Abrir", href: itemHref(kind, item) };
    case "NEGATIVE_STOCK":
      return { id: "link", label: "Ver estoque", href: itemHref(kind, item) };
  }
}

const NUMBERED: Partial<Record<PendingActionItem["entity"]["type"], string>> = {
  SALE: "Venda",
  QUOTE: "Orçamento",
  PURCHASE: "Compra",
};

export function itemLabel(item: PendingActionItem): string {
  const noun = NUMBERED[item.entity.type];
  return noun && item.number ? `${noun} nº ${item.number} · ${item.title}` : item.title;
}

export function itemContext(kind: PendingActionKind, item: PendingActionItem): string {
  const parts: string[] = [];
  if (item.date) {
    const label = kind === "DELIVERY_DUE" || kind === "ITEMS_WITHOUT_SUPPLIER" ? "prazo" : kind === "QUOTE_STALE" ? "de" : "venc.";
    parts.push(`${label} ${formatDate(item.date)}`);
  }
  if (item.quantity !== null) {
    if (kind === "NEGATIVE_STOCK") parts.push(`saldo ${item.quantity}`);
    else parts.push(`${item.quantity} ${item.quantity === 1 ? "item" : "items"}`);
  }
  return parts.join(" · ");
}
