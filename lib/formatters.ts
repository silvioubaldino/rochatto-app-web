import { format, parseISO } from "date-fns";
import type {
  QuoteStatus,
  PartnerType,
  LeadSource,
  ItemOrigin,
  PurchaseKind,
  PurchaseStatus,
  SupplierKind,
  ObligationDirection,
  ObligationStatus,
  InstallmentStatus,
  MovementCategory,
  AllocationMethod,
  ObligationComponent,
  PurchaseChargeKind,
  SaleChargeKind,
  SaleCostKind,
  ObligationWarning,
  CounterpartyType,
  ObligationOriginType,
  NotificacaoTipo,
  SaleDeliveryStatus,
  SalePaymentStatus,
  StockAdjustmentReason,
  StockMovementKind,
  SaleItemWarning,
  PaymentMethod,
} from "./types";

export function formatMoeda(valor: number): string {
  const v = typeof valor === "number" ? valor : (Number(valor) || 0);
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatData(isoDate: string): string {
  return format(parseISO(isoDate), "dd/MM/yyyy");
}

/** Data de hoje em "yyyy-MM-dd" (valor de <input type="date">), no fuso local. */
export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

/** Quantidade em pt-BR (até 3 casas — `DECIMAL(12,3)`). */
export function formatQuantidade(valor: number): string {
  const v = typeof valor === "number" ? valor : Number(valor) || 0;
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

// AYD-002 — rótulos e cores dos enums de atendimento (nunca exibir o código do enum).

export const SALE_DELIVERY_STATUSES: SaleDeliveryStatus[] = ["TO_DELIVER", "DELIVERED", "CANCELED"];

export const SALE_DELIVERY_STATUS_LABELS: Record<SaleDeliveryStatus, string> = {
  TO_DELIVER: "A entregar",
  DELIVERED: "Entregue",
  CANCELED: "Cancelada",
};

export const SALE_DELIVERY_STATUS_COLORS: Record<SaleDeliveryStatus, string> = {
  TO_DELIVER: "bg-yellow-100 text-yellow-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELED: "bg-gray-200 text-gray-700",
};

export const SALE_PAYMENT_STATUSES: SalePaymentStatus[] = ["PENDING", "PARTIAL", "PAID"];

export const SALE_PAYMENT_STATUS_LABELS: Record<SalePaymentStatus, string> = {
  PENDING: "Pendente",
  PARTIAL: "Parcial",
  PAID: "Quitado",
};

export const SALE_PAYMENT_STATUS_COLORS: Record<SalePaymentStatus, string> = {
  PENDING: "bg-red-100 text-red-800",
  PARTIAL: "bg-blue-100 text-blue-800",
  PAID: "bg-green-100 text-green-800",
};

export const ITEM_ORIGINS: ItemOrigin[] = ["MADE_TO_ORDER", "FROM_STOCK"];

export const ITEM_ORIGIN_LABELS: Record<ItemOrigin, string> = {
  MADE_TO_ORDER: "Sob encomenda",
  FROM_STOCK: "De estoque",
};

export const PURCHASE_KINDS: PurchaseKind[] = ["MADE_TO_ORDER", "STOCK_REPLENISHMENT"];

export const PURCHASE_KIND_LABELS: Record<PurchaseKind, string> = {
  MADE_TO_ORDER: "Sob encomenda",
  STOCK_REPLENISHMENT: "Reposição de estoque",
};

export const PURCHASE_CHARGE_KINDS: PurchaseChargeKind[] = ["FREIGHT", "UNLOADING", "TAX", "OTHER"];

export const PURCHASE_CHARGE_KIND_LABELS: Record<PurchaseChargeKind, string> = {
  FREIGHT: "Frete de compra",
  UNLOADING: "Descarga",
  TAX: "Imposto",
  OTHER: "Outro",
};

export const ALLOCATION_METHODS: AllocationMethod[] = ["BY_QUANTITY", "BY_VALUE"];

export const ALLOCATION_METHOD_LABELS: Record<AllocationMethod, string> = {
  BY_QUANTITY: "Por quantidade (m²)",
  BY_VALUE: "Por valor",
};

export const PURCHASE_STATUSES: PurchaseStatus[] = ["OPEN", "ORDERED", "RECEIVED"];

export const PURCHASE_STATUS_LABELS: Record<PurchaseStatus, string> = {
  OPEN: "Aberta",
  ORDERED: "Pedida",
  RECEIVED: "Recebida",
};

export const PURCHASE_STATUS_COLORS: Record<PurchaseStatus, string> = {
  OPEN: "bg-yellow-100 text-yellow-800",
  ORDERED: "bg-blue-100 text-blue-800",
  RECEIVED: "bg-green-100 text-green-800",
};

export const STOCK_ADJUSTMENT_REASONS: StockAdjustmentReason[] = ["INITIAL", "COUNT", "OTHER"];

export const STOCK_ADJUSTMENT_REASON_LABELS: Record<StockAdjustmentReason, string> = {
  INITIAL: "Carga inicial",
  COUNT: "Contagem",
  OTHER: "Outro",
};

export const STOCK_MOVEMENT_KIND_LABELS: Record<StockMovementKind, string> = {
  INFLOW: "Entrada",
  OUTFLOW: "Saída",
  ADJUSTMENT: "Ajuste",
};

export const SALE_ITEM_WARNING_LABELS: Record<SaleItemWarning, string> = {
  INSUFFICIENT_STOCK:
    "Saldo insuficiente em estoque — a venda foi registrada e o saldo pode ficar negativo (corrija com um ajuste).",
};

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  OPEN: "Aberto",
  WON: "Ganho",
  LOST: "Perdido",
};

export const QUOTE_STATUS_COLORS: Record<QuoteStatus, string> = {
  OPEN: "bg-yellow-100 text-yellow-800",
  WON: "bg-green-100 text-green-800",
  LOST: "bg-red-100 text-red-800",
};

// AYD-003 — Partner type e Lead source (rótulos PT-BR; nunca exibir o código do enum).
export const PARTNER_TYPES: PartnerType[] = ["ARCHITECT", "ENGINEER", "BUILDER", "OTHER"];

export const PARTNER_TYPE_LABELS: Record<PartnerType, string> = {
  ARCHITECT: "Arquiteto",
  ENGINEER: "Engenheiro",
  BUILDER: "Construtora",
  OTHER: "Outro",
};

export const LEAD_SOURCES: LeadSource[] = ["REFERRAL", "INSTAGRAM", "PARTNER", "OTHER"];

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  REFERRAL: "Indicação",
  INSTAGRAM: "Instagram",
  PARTNER: "Parceiro",
  OTHER: "Outro",
};

/** "Parceiro · Fulano" quando a origem é um Partner; "—" quando não informada. */
export function formatLeadSource(
  leadSource?: LeadSource | null,
  referrerName?: string | null,
): string {
  if (!leadSource) return "—";
  const label = LEAD_SOURCE_LABELS[leadSource] ?? "—";
  return leadSource === "PARTNER" && referrerName ? `${label} · ${referrerName}` : label;
}

// AYD-004 — forma de pagamento (nunca exibir o código do enum).
export const PAYMENT_METHODS: PaymentMethod[] = ["PIX", "CASH", "CARD", "BOLETO", "TRANSFER"];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  PIX: "Pix",
  CASH: "Dinheiro",
  CARD: "Cartão",
  BOLETO: "Boleto",
  TRANSFER: "Transferência",
};

/** Rótulo da forma de pagamento; null/ausente = "Não informado". */
export function formatPaymentMethod(method?: PaymentMethod | null): string {
  return method ? (PAYMENT_METHOD_LABELS[method] ?? "Não informado") : "Não informado";
}

/** Taxa 0..1 → "42%" (arredondada); null → "—" (ex.: conversão Quote → Sale sem Quotes). */
export function formatPercentRate(rate: number | null | undefined): string {
  if (rate === null || rate === undefined || Number.isNaN(rate)) return "—";
  return `${Math.round(rate * 100)}%`;
}

// Assistant connector (AYD-006)
export const CONNECTION_SCOPE_LABELS: Record<string, string> = {
  read: "Consultar dados (clientes, orçamentos, vendas, financeiro, estoque)",
  write: "Lançar dados (orçamentos, vendas, recebimentos, compras, ajustes de estoque)",
};

/** Rótulo de um scope; scope desconhecido aparece como veio da API. */
export function formatConnectionScope(scope: string): string {
  return CONNECTION_SCOPE_LABELS[scope] ?? scope;
}

/** Data e hora em pt-BR, no fuso local: "dd/MM/yyyy HH:mm". */
export function formatDataHora(isoDate: string): string {
  return format(parseISO(isoDate), "dd/MM/yyyy HH:mm");
}

// AYD-007 — contas e movimentações (rótulos PT-BR; nunca exibir o código do enum).

export const SUPPLIER_KINDS: SupplierKind[] = ["STONE", "TRANSPORT", "LABOR", "TAX_AUTHORITY", "OTHER"];

export const SUPPLIER_KIND_LABELS: Record<SupplierKind, string> = {
  STONE: "Pedra",
  TRANSPORT: "Transporte",
  LABOR: "Mão de obra",
  TAX_AUTHORITY: "Órgão de imposto",
  OTHER: "Outro",
};

export const DIRECTION_LABELS: Record<ObligationDirection, string> = {
  PAYABLE: "A pagar",
  RECEIVABLE: "A receber",
};

export const OBLIGATION_STATUSES: ObligationStatus[] = ["OPEN", "PARTIAL", "SETTLED"];

export const OBLIGATION_STATUS_LABELS: Record<ObligationStatus, string> = {
  OPEN: "Aberta",
  PARTIAL: "Parcial",
  SETTLED: "Quitada",
};

export const OBLIGATION_STATUS_COLORS: Record<ObligationStatus, string> = {
  OPEN: "bg-yellow-100 text-yellow-800",
  PARTIAL: "bg-blue-100 text-blue-800",
  SETTLED: "bg-green-100 text-green-800",
};

export const INSTALLMENT_STATUS_LABELS: Record<InstallmentStatus, string> = {
  OPEN: "Aberta",
  PARTIAL: "Parcial",
  COVERED: "Coberta",
};

export const INSTALLMENT_STATUS_COLORS: Record<InstallmentStatus, string> = {
  OPEN: "bg-yellow-100 text-yellow-800",
  PARTIAL: "bg-blue-100 text-blue-800",
  COVERED: "bg-green-100 text-green-800",
};

export const MOVEMENT_CATEGORY_LABELS: Record<MovementCategory, string> = {
  SALE_RECEIPT: "Recebimento de venda",
  OTHER_INCOME: "Outra receita",
  PURCHASE_PAYMENT: "Pagamento de compra",
  FREIGHT: "Frete",
  LABOR: "Mão de obra",
  COMMISSION: "Comissão",
  VEHICLE: "Veículo",
  TAXES: "Impostos",
  FIXED_COSTS: "Custos fixos",
  MARKETING: "Marketing",
  BANK_FEES: "Tarifas bancárias",
  OTHER_EXPENSE: "Outra despesa",
};

/** Categorias que o dono escolhe ao lançar uma despesa (saída sem quitação). */
export const EXPENSE_CATEGORIES: MovementCategory[] = [
  "VEHICLE",
  "TAXES",
  "FIXED_COSTS",
  "MARKETING",
  "BANK_FEES",
  "LABOR",
  "OTHER_EXPENSE",
];

/** Categoria de entrada avulsa; SALE_RECEIPT só nasce de uma quitação. */
export const INCOME_CATEGORIES: MovementCategory[] = ["OTHER_INCOME"];

/** Entradas (valor > 0). As demais categorias são saídas (valor < 0) — AYD-007 §Enums. */
export const INFLOW_CATEGORIES: MovementCategory[] = ["SALE_RECEIPT", "OTHER_INCOME"];

export function isInflowCategory(category: MovementCategory): boolean {
  return INFLOW_CATEGORIES.includes(category);
}

export const COUNTERPARTY_TYPE_LABELS: Record<CounterpartyType, string> = {
  SUPPLIER: "Fornecedor",
  PARTNER: "Parceiro",
  CUSTOMER: "Cliente",
};

export const OBLIGATION_COMPONENT_LABELS: Record<string, string> = {
  SALE_ITEMS: "Itens da venda",
  LEGACY_FREIGHT: "Frete da venda",
  LEGACY_COMMISSION: "Comissão",
  PURCHASE_ITEMS: "Pedras da compra",
};

/** Rótulo do componente: o mapa conhecido, senão o `label` que a API enviou. */
export function formatComponentLabel(component: Pick<ObligationComponent, "type" | "label">): string {
  return OBLIGATION_COMPONENT_LABELS[component.type] ?? component.label;
}

export const OBLIGATION_ORIGIN_LABELS: Record<ObligationOriginType, string> = {
  SALE: "Venda",
  PURCHASE: "Compra",
};

/** Rota da origem da conta (Sale → /vendas, Purchase → /compras). */
export function obligationOriginHref(origin: { type: ObligationOriginType; id: string }): string {
  return origin.type === "SALE" ? `/vendas/${origin.id}` : `/compras/${origin.id}`;
}

/** Credor/devedor da conta; sem credor = "A definir". */
export function formatCounterparty(counterparty: { name: string } | null | undefined): string {
  return counterparty?.name ?? "A definir";
}

export const OBLIGATION_WARNING_MESSAGES: Record<ObligationWarning, string> = {
  MIXED_COUNTERPARTIES:
    "As contas são de credores diferentes — um Pix tem um único destinatário. Confira se é isso mesmo.",
  OVERSETTLED:
    "A conta ficou com mais quitação do que o valor devido. Ajuste ou desfaça a quitação.",
};

export const NOTIFICATION_LABELS: Record<NotificacaoTipo, string> = {
  pagamento_vencido: "Pagamento vencido",
  pagamento_vencendo: "Pagamento agendado",
  conta_pagar_vencida: "Conta a pagar vencida",
  conta_pagar_vencendo: "Conta a pagar vencendo",
};

export const SALE_CHARGE_KINDS: SaleChargeKind[] = ["FREIGHT", "OTHER"];

export const SALE_CHARGE_KIND_LABELS: Record<SaleChargeKind, string> = {
  FREIGHT: "Frete cobrado",
  OTHER: "Outra cobrança",
};

export const SALE_COST_KINDS: SaleCostKind[] = ["FREIGHT", "LABOR", "COMMISSION", "OTHER"];

export const SALE_COST_KIND_LABELS: Record<SaleCostKind, string> = {
  FREIGHT: "Frete pago",
  LABOR: "Instalador / mão de obra",
  COMMISSION: "Comissão",
  OTHER: "Outro",
};
