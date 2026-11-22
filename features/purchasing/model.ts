// Regras puras de apresentação das Compras (T11/T12 — AYD-011): chips, trilha de status,
// próximo passo, transições, fila "a comprar". Sem React, sem rede.
import { docNumber } from "@/lib/format";
import type {
  Obligation,
  PendingSaleItemGroup,
  PurchaseDetail,
  PurchaseKind,
  PurchaseListItem,
  PurchaseStatus,
  SaleDeliveryStatus,
} from "@/lib/types";

// --- Lista ------------------------------------------------------------------

export const PURCHASE_CHIPS = [
  { value: "OPEN", label: "Abertas" },
  { value: "ORDERED", label: "Pedidas" },
  { value: "RECEIVED", label: "Recebidas" },
  { value: "", label: "Todas" },
] as const;

/** Contas da compra: sem filtro, só com saldo a pagar (`open_only`) ou só com conta vencida (`overdue`). */
export const PURCHASE_ACCOUNT_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "open", label: "Com saldo a pagar" },
  { value: "overdue", label: "Com conta vencida" },
] as const;

export interface PurchaseListFilters {
  kind?: PurchaseKind;
  status?: PurchaseStatus;
  supplier_id?: string;
  from?: string;
  to?: string;
  open_only?: boolean;
  overdue?: boolean;
}

/** Caminho da api (e chave SWR) de `GET /purchases` com os filtros. */
export function purchasesQuery(filters: PurchaseListFilters = {}): string {
  const p = new URLSearchParams();
  if (filters.kind) p.set("kind", filters.kind);
  if (filters.status) p.set("status", filters.status);
  if (filters.supplier_id) p.set("supplier_id", filters.supplier_id);
  if (filters.from) p.set("from", filters.from);
  if (filters.to) p.set("to", filters.to);
  if (filters.open_only) p.set("open_only", "true");
  if (filters.overdue) p.set("overdue", "true");
  const qs = p.toString();
  return qs ? `/purchases?${qs}` : "/purchases";
}

const STATUSES: readonly string[] = ["OPEN", "ORDERED", "RECEIVED"];
const KINDS: readonly string[] = ["MADE_TO_ORDER", "STOCK_REPLENISHMENT"];

/** Valores crus da URL → filtros da api (valor inválido é ignorado). */
export function filtersFromUrl(v: { status: string; kind: string; supplier_id: string; from: string; to: string; contas: string }): PurchaseListFilters {
  return {
    status: STATUSES.includes(v.status) ? (v.status as PurchaseStatus) : undefined,
    kind: KINDS.includes(v.kind) ? (v.kind as PurchaseKind) : undefined,
    supplier_id: v.supplier_id || undefined,
    from: v.from || undefined,
    to: v.to || undefined,
    open_only: v.contas === "open" || undefined,
    overdue: v.contas === "overdue" || undefined,
  };
}

/** "Compra nº 12" para a lista e os títulos. */
export const purchaseTitle = (p: Pick<PurchaseListItem, "number" | "id">) => docNumber("Compra", p.number, p.id);

/** Previsão no fornecedor já passou e a compra ainda não chegou? */
export function isExpectedLate(p: Pick<PurchaseListItem, "expected_date" | "status">, today: string): boolean {
  return !!p.expected_date && p.status !== "RECEIVED" && p.expected_date.slice(0, 10) < today;
}

export function purchaseTotals(rows: readonly Pick<PurchaseListItem, "total_cost" | "payable">[]) {
  return {
    cost: rows.reduce((s, p) => s + (p.total_cost ?? 0), 0),
    payable: rows.reduce((s, p) => s + (p.payable ?? 0), 0),
  };
}

// --- Trilha e transições -------------------------------------------------------

export interface TrailStep {
  status: PurchaseStatus;
  label: string;
  state: "done" | "current" | "todo";
}

const TRAIL: readonly { status: PurchaseStatus; label: string }[] = [
  { status: "OPEN", label: "Aberta" },
  { status: "ORDERED", label: "Pedida" },
  { status: "RECEIVED", label: "Recebida" },
];

/** `Aberta → Pedida → Recebida` com o passo atual (T12). */
export function statusTrail(status: PurchaseStatus): TrailStep[] {
  const at = TRAIL.findIndex((s) => s.status === status);
  return TRAIL.map((s, i) => ({ ...s, state: i < at ? "done" : i === at ? "current" : "todo" }));
}

export interface PurchaseTransition {
  to: PurchaseStatus;
  label: string;
  /** Pede confirmação? (só o irreversível: RECEIVED). As demais têm "Desfazer". */
  confirm: boolean;
  description: string;
  undoMessage?: string;
}

/** Transições permitidas (AYD-002): OPEN→ORDERED, ORDERED→OPEN, ORDERED→RECEIVED. */
export function transitionsFor(status: PurchaseStatus, kind: PurchaseKind): PurchaseTransition[] {
  if (status === "OPEN") {
    return [
      {
        to: "ORDERED",
        label: "Marcar como pedida",
        confirm: false,
        description: "A compra passa para Pedida: os Items deixam de poder ser incluídos ou removidos.",
        undoMessage: "Compra marcada como pedida.",
      },
    ];
  }
  if (status === "ORDERED") {
    return [
      {
        to: "RECEIVED",
        label: "Marcar como recebida",
        confirm: true,
        description:
          kind === "STOCK_REPLENISHMENT"
            ? "A compra passa para Recebida (definitivo) e as quantidades entram no saldo do estoque."
            : "A compra passa para Recebida (definitivo).",
      },
      {
        to: "OPEN",
        label: "Voltar para aberta",
        confirm: false,
        description: "A compra volta para Aberta e pode ter Items incluídos ou removidos.",
        undoMessage: "Compra voltou para aberta.",
      },
    ];
  }
  return [];
}

/** Desfazer de uma transição: a inversa (RECEIVED é definitiva — sem desfazer). */
export function undoTarget(to: PurchaseStatus): PurchaseStatus | null {
  if (to === "ORDERED") return "OPEN";
  if (to === "OPEN") return "ORDERED";
  return null;
}

// --- Próximo passo ----------------------------------------------------------------

export type PurchaseStepId = "add-items" | "mark-ordered" | "mark-received" | "deliver" | "pay";

export interface PurchaseStep {
  id: PurchaseStepId;
  title: string;
  description?: string;
  label: string;
  tone: "warning" | "info" | "success";
}

export interface PurchaseStepContext {
  today: string;
  /** Situação de entrega das Sales dos Items (por `sale_id`), se já carregada. */
  salesById?: Readonly<Record<string, { delivery_status: SaleDeliveryStatus }>>;
}

export const lineCount = (p: Pick<PurchaseDetail, "kind" | "items" | "sale_items">): number =>
  p.kind === "STOCK_REPLENISHMENT" ? (p.items?.length ?? 0) : (p.sale_items?.length ?? 0);

/** Sales dos Items desta compra que ainda estão a entregar. */
export function salesToDeliver(p: Pick<PurchaseDetail, "sale_items">, ctx: Pick<PurchaseStepContext, "salesById">): string[] {
  const ids = new Set((p.sale_items ?? []).map((i) => i.sale_id));
  return [...ids].filter((id) => ctx.salesById?.[id]?.delivery_status === "TO_DELIVER");
}

/** Contas a pagar da compra com saldo em aberto. */
export const openPayables = (obligations: readonly Obligation[] | undefined): Obligation[] =>
  (obligations ?? []).filter((o) => o.direction === "PAYABLE" && o.open > 0);

/**
 * O que falta nesta compra (T12): sem linhas → adicionar Items; aberta com linhas → pedir;
 * pedida com previsão vencida → receber; recebida com vendas a entregar → entregar; saldo → pagar.
 */
export function nextStep(p: PurchaseDetail, ctx: PurchaseStepContext): PurchaseStep | null {
  const replenishment = p.kind === "STOCK_REPLENISHMENT";
  if (lineCount(p) === 0 && p.status === "OPEN") {
    return {
      id: "add-items",
      title: replenishment ? "Falta incluir os produtos" : "Falta incluir os Items",
      description: replenishment ? "Adicione ao menos um produto antes de marcar como pedida." : "Traga Items da fila “a comprar” antes de marcar como pedida.",
      label: replenishment ? "Adicionar produto" : "Adicionar da fila",
      tone: "warning",
    };
  }
  if (p.status === "OPEN") {
    return { id: "mark-ordered", title: "Pedir ao fornecedor", description: "Os Items ficam travados até a compra chegar.", label: "Marcar como pedida", tone: "warning" };
  }
  if (p.status === "ORDERED" && p.expected_date && p.expected_date.slice(0, 10) <= ctx.today) {
    return { id: "mark-received", title: "A mercadoria já deveria ter chegado", description: "Confirme o recebimento para liberar as entregas.", label: "Marcar como recebida", tone: "warning" };
  }
  if (p.status === "RECEIVED") {
    const sales = salesToDeliver(p, ctx);
    if (sales.length > 0) {
      return {
        id: "deliver",
        title: `${sales.length} ${sales.length === 1 ? "venda a entregar" : "vendas a entregar"}`,
        description: "A compra chegou: entregue ao cliente e marque como entregue.",
        label: "Entregar vendas desta compra",
        tone: "info",
      };
    }
  }
  const payables = openPayables(p.obligations);
  if (payables.length > 0) {
    return { id: "pay", title: "Há contas a pagar desta compra", label: payables.length > 1 ? "Pagar contas" : "Pagar", tone: "info" };
  }
  return null;
}

// --- Fila "a comprar" ---------------------------------------------------------------

/** Fornecedores em ordem alfabética; o grupo sem fornecedor por último; grupos vazios saem. */
export function sortQueueGroups(groups: readonly PendingSaleItemGroup[]): PendingSaleItemGroup[] {
  return groups
    .filter((g) => g.items.length > 0)
    .sort((a, b) => {
      if (!a.supplier_id) return 1;
      if (!b.supplier_id) return -1;
      return (a.supplier_name ?? "").localeCompare(b.supplier_name ?? "", "pt-BR");
    });
}

export const queueCount = (groups: readonly PendingSaleItemGroup[]): number => groups.reduce((n, g) => n + g.items.length, 0);

/** Items do grupo que seguem marcados (a seleção guarda só os DESMARCADOS: tudo vem marcado). */
export function selectedQueueItems(group: PendingSaleItemGroup, excluded: ReadonlySet<string>) {
  return group.items.filter((i) => !excluded.has(i.id));
}

export const queueItemCost = (i: { quantidade: number; custo_unit: number }): number => Math.round(i.quantidade * i.custo_unit * 100) / 100;

export const queueCost = (items: readonly { quantidade: number; custo_unit: number }[]): number =>
  Math.round(items.reduce((s, i) => s + queueItemCost(i) * 100, 0)) / 100;

/** Alterna um id no conjunto (imutável). */
export function toggleId(set: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}
