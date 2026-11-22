// Regras da venda: próximo passo (T06), atendimento por linha, chips da lista (T07) — puras e testadas.
import { docNumber, formatDate, formatMoney, formatQuantity, ITEM_ORIGIN_LABELS, PURCHASE_STATUS_LABELS, type Tone } from "@/lib/format";
import type { ItemLine } from "@/components/entity/items-grid";
import type { Obligation, PurchaseStatus, Venda } from "@/lib/types";

export interface PurchaseInfo {
  id: string;
  number?: number;
  status: PurchaseStatus;
  supplier_id: string;
  expected_date: string | null;
}

export interface SaleStepContext {
  today: string;
  /** Compras conhecidas (lista), por id. */
  purchases: Readonly<Record<string, PurchaseInfo>>;
  /** Conta a receber da venda (lista de /obligations; sem parcelas detalhadas). */
  receivable: Pick<Obligation, "open" | "overdue" | "due_date" | "next_installment"> | null;
}

export type SaleStepId =
  | "define-fulfillment"
  | "generate-purchase"
  | "define-plan"
  | "receive-overdue"
  | "deliver"
  | "define-payee"
  | "receive";

export interface SaleStep {
  id: SaleStepId;
  title: string;
  description?: string;
  label: string;
  tone: Tone;
  /** `generate-purchase`: fornecedores com Items fora de compra. */
  supplierIds?: string[];
}

const productItems = (sale: Venda) => (sale.itens ?? []).filter((i) => (i.kind ?? "PRODUCT") === "PRODUCT");

/** O que falta para a venda andar — o primeiro que se aplica (tabela do AYD-011 T06). */
export function nextStep(sale: Venda, ctx: SaleStepContext): SaleStep | null {
  if (sale.delivery_status === "CANCELED") return null;
  const made = productItems(sale).filter((i) => i.origin === "MADE_TO_ORDER");

  const without = made.filter((i) => !i.fornecedor_id && !i.purchase_id);
  if (without.length > 0) {
    return {
      id: "define-fulfillment",
      title: `${without.length} ${without.length === 1 ? "item sem fornecedor" : "items sem fornecedor"}`,
      description: "Defina de quem comprar para o item entrar na fila de compra.",
      label: "Definir atendimento",
      tone: "warning",
    };
  }

  const toBuy = made.filter((i) => i.fornecedor_id && !i.purchase_id);
  if (toBuy.length > 0) {
    const supplierIds = [...new Set(toBuy.map((i) => i.fornecedor_id as string))];
    return {
      id: "generate-purchase",
      title: "Falta comprar os items sob encomenda",
      description: supplierIds.length === 1 ? undefined : `${supplierIds.length} fornecedores: uma compra para cada.`,
      label: supplierIds.length === 1 ? "Gerar compra" : "Gerar compras",
      tone: "warning",
      supplierIds,
    };
  }

  const r = ctx.receivable;
  if (r && r.open > 0 && !r.next_installment && !r.due_date) {
    return {
      id: "define-plan",
      title: "O recebimento ainda não tem plano",
      description: `${formatMoney(r.open)} a receber sem datas.`,
      label: "Definir recebimento",
      tone: "warning",
    };
  }
  if (r && r.open > 0 && r.overdue) {
    return {
      id: "receive-overdue",
      title: "Há parcela vencida",
      description: `${formatMoney(r.next_installment?.amount_open ?? r.open)} vencido.`,
      label: "Receber",
      tone: "danger",
    };
  }

  const due = sale.data_entrega_prevista?.slice(0, 10);
  const purchasesReceived = made.every((i) => !!i.purchase_id && ctx.purchases[i.purchase_id]?.status === "RECEIVED");
  if (sale.delivery_status === "TO_DELIVER" && due && due <= ctx.today && purchasesReceived) {
    return { id: "deliver", title: "Chegou o prazo de entrega", description: `Prazo ${formatDate(due)}.`, label: "Marcar entregue", tone: "info" };
  }

  if ((sale.composition?.costs ?? []).some((c) => !c.payee && c.amount > 0)) {
    return { id: "define-payee", title: "Há custo sem credor", description: "Defina quem recebe para gerar a conta a pagar.", label: "Definir credor", tone: "warning" };
  }

  if (r && r.open > 0) {
    return { id: "receive", title: `${formatMoney(r.open)} a receber`, label: "Receber", tone: "info" };
  }
  return null;
}

export interface AttendanceView {
  text: string;
  tone?: Tone;
}

/** Coluna "Atendimento": origem, fornecedor e situação da compra (T06). */
export function attendanceView(line: ItemLine, purchases: Readonly<Record<string, PurchaseInfo>>): AttendanceView {
  if (line.kind === "SERVICE") return { text: "Serviço" };
  if (line.origin === "FROM_STOCK") {
    const bal = line.stockBalance;
    if (bal === null || bal === undefined) return { text: ITEM_ORIGIN_LABELS.FROM_STOCK };
    return {
      text: `${ITEM_ORIGIN_LABELS.FROM_STOCK} · saldo atual ${formatQuantity(bal, line.unit)}${bal < 0 ? " ⚠" : ""}`,
      tone: bal < 0 ? "warning" : undefined,
    };
  }
  const head = ITEM_ORIGIN_LABELS.MADE_TO_ORDER;
  if (!line.supplierId) return { text: `${head} · definir fornecedor`, tone: "warning" };
  const supplier = line.supplierName ?? "fornecedor";
  if (!line.purchaseId) return { text: `${head} · ${supplier} · a comprar`, tone: "warning" };
  const p = purchases[line.purchaseId];
  const parts = [head, supplier, docNumber("Compra", p?.number, line.purchaseId)];
  if (p) {
    parts.push(PURCHASE_STATUS_LABELS[p.status]);
    if (p.status !== "RECEIVED" && p.expected_date) parts.push(`prev. ${formatDate(p.expected_date.slice(0, 10))}`);
  }
  return { text: parts.join(" · ") };
}

/** Por que a linha está travada (explicado antes de editar — UX-9). */
export function lockReasonFor(line: ItemLine, purchases: Readonly<Record<string, PurchaseInfo>>): string | null {
  if (!line.purchaseId) return null;
  const p = purchases[line.purchaseId];
  const label = docNumber("Compra", p?.number, line.purchaseId);
  return `Item na ${label}${p ? ` (${PURCHASE_STATUS_LABELS[p.status].toLowerCase()})` : ""}: só o preço muda.`;
}

/** RN-15: a venda só cancela se nenhum Item estiver em compra pedida ou recebida. */
export function cancelBlockedReason(sale: Venda, purchases: Readonly<Record<string, PurchaseInfo>>): string | null {
  const blocked = (sale.itens ?? []).some((i) => {
    const p = i.purchase_id ? purchases[i.purchase_id] : undefined;
    return p && p.status !== "OPEN";
  });
  return blocked ? "Há Item em compra pedida ou recebida: não dá para cancelar a venda." : null;
}

// --- T07: chips da lista de vendas ------------------------------------------------------

export type SaleChip = "" | "to-deliver" | "late" | "receivable";

export const SALE_CHIPS: readonly { value: SaleChip; label: string }[] = [
  { value: "", label: "Todas" },
  { value: "to-deliver", label: "A entregar" },
  { value: "late", label: "Atrasadas" },
  { value: "receivable", label: "Com saldo a receber" },
];

/** Filtros da api (e do cliente) que cada chip representa. */
export function chipFilters(chip: SaleChip): { delivery_status?: "TO_DELIVER"; payment_status?: "PENDING,PARTIAL"; late?: boolean } {
  if (chip === "to-deliver") return { delivery_status: "TO_DELIVER" };
  if (chip === "late") return { delivery_status: "TO_DELIVER", late: true };
  if (chip === "receivable") return { payment_status: "PENDING,PARTIAL" };
  return {};
}

/** Entrega atrasada: a entregar com prazo antes de hoje. */
export function isLate(sale: Pick<Venda, "delivery_status" | "data_entrega_prevista">, today: string): boolean {
  return sale.delivery_status === "TO_DELIVER" && !!sale.data_entrega_prevista && sale.data_entrega_prevista.slice(0, 10) < today;
}

export interface SaleChipValues {
  delivery_status: string;
  payment_status: string;
  late: string;
}

/** Qual chip a URL representa; combinação fora dos chips (ex.: vinda de um painel) = "custom". */
export function chipOf(v: SaleChipValues): SaleChip | "custom" {
  const none = !v.delivery_status && !v.payment_status && !v.late;
  if (none) return "";
  if (v.delivery_status === "TO_DELIVER" && !v.payment_status) return v.late === "1" ? "late" : "to-deliver";
  if (v.payment_status === "PENDING,PARTIAL" && !v.delivery_status && !v.late) return "receivable";
  return "custom";
}

/** Valores da URL que um chip aplica (zera os outros dois). */
export function chipPatch(chip: SaleChip): SaleChipValues {
  const f = chipFilters(chip);
  return { delivery_status: f.delivery_status ?? "", payment_status: f.payment_status ?? "", late: f.late ? "1" : "" };
}
