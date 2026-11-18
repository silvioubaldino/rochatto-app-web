import { format, parseISO } from "date-fns";
import type {
  QuoteStatus,
  PartnerType,
  LeadSource,
  ItemOrigin,
  PurchaseKind,
  PurchaseStatus,
  SupplierPaymentStatus,
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

export const SUPPLIER_PAYMENT_STATUSES: SupplierPaymentStatus[] = ["PENDING", "PAID"];

export const SUPPLIER_PAYMENT_STATUS_LABELS: Record<SupplierPaymentStatus, string> = {
  PENDING: "Pendente",
  PAID: "Pago",
};

export const SUPPLIER_PAYMENT_STATUS_COLORS: Record<SupplierPaymentStatus, string> = {
  PENDING: "bg-orange-100 text-orange-800",
  PAID: "bg-green-100 text-green-800",
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

// AYD-004 — forma de pagamento do Receipt (nunca exibir o código do enum).
export const PAYMENT_METHODS: PaymentMethod[] = ["PIX", "CASH", "CARD", "BOLETO", "TRANSFER"];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  PIX: "Pix",
  CASH: "Dinheiro",
  CARD: "Cartão",
  BOLETO: "Boleto",
  TRANSFER: "Transferência",
};

/** Rótulo da forma de pagamento; null/ausente (Receipt legado ou pendente) = "Não informado". */
export function formatPaymentMethod(method?: PaymentMethod | null): string {
  return method ? (PAYMENT_METHOD_LABELS[method] ?? "Não informado") : "Não informado";
}

/** Taxa 0..1 → "42%" (arredondada); null → "—" (ex.: conversão Quote → Sale sem Quotes). */
export function formatPercentRate(rate: number | null | undefined): string {
  if (rate === null || rate === undefined || Number.isNaN(rate)) return "—";
  return `${Math.round(rate * 100)}%`;
}
