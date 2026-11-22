import type {
  InstallmentStatus,
  ItemKind,
  ItemOrigin,
  ObligationStatus,
  PurchaseStatus,
  QuoteStatus,
  SaleDeliveryStatus,
  SalePaymentStatus,
} from "../types";
import {
  INSTALLMENT_STATUS_LABELS,
  ITEM_KIND_LABELS,
  ITEM_ORIGIN_LABELS,
  OBLIGATION_STATUS_LABELS,
  PURCHASE_STATUS_LABELS,
  QUOTE_STATUS_LABELS,
  SALE_DELIVERY_STATUS_LABELS,
  SALE_PAYMENT_STATUS_LABELS,
  saleDeliveryLabel,
} from "./labels";

export type Tone = "success" | "warning" | "danger" | "info" | "neutral";

export const TONE_SUBTLE_CLASSES: Record<Tone, string> = {
  success: "bg-success-subtle text-success",
  warning: "bg-warning-subtle text-warning",
  danger: "bg-danger-subtle text-danger",
  info: "bg-info-subtle text-info",
  neutral: "bg-neutral-subtle text-neutral",
};

export const TONE_TEXT_CLASSES: Record<Tone, string> = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-info",
  neutral: "text-neutral",
};

export const TONE_SOLID_CLASSES: Record<Tone, string> = {
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
  danger: "bg-danger text-danger-foreground",
  info: "bg-info text-info-foreground",
  neutral: "bg-neutral text-neutral-foreground",
};

export interface StatusMeta {
  label: string;
  tone: Tone;
}

export type StatusKind =
  | "quote"
  | "saleDelivery"
  | "salePayment"
  | "purchase"
  | "obligation"
  | "installment"
  | "itemOrigin"
  | "itemKind";

type Registry = {
  quote: Record<QuoteStatus, Tone>;
  saleDelivery: Record<SaleDeliveryStatus, Tone>;
  salePayment: Record<SalePaymentStatus, Tone>;
  purchase: Record<PurchaseStatus, Tone>;
  obligation: Record<ObligationStatus, Tone>;
  installment: Record<InstallmentStatus, Tone>;
  itemOrigin: Record<ItemOrigin, Tone>;
  itemKind: Record<ItemKind, Tone>;
};

export const STATUS_TONES: Registry = {
  quote: { OPEN: "warning", WON: "success", LOST: "danger" },
  saleDelivery: { TO_DELIVER: "warning", DELIVERED: "success", CANCELED: "neutral" },
  salePayment: { PENDING: "warning", PARTIAL: "info", PAID: "success" },
  purchase: { OPEN: "warning", ORDERED: "warning", RECEIVED: "success" },
  obligation: { OPEN: "warning", PARTIAL: "warning", SETTLED: "success" },
  installment: { OPEN: "warning", PARTIAL: "warning", COVERED: "success" },
  itemOrigin: { MADE_TO_ORDER: "info", FROM_STOCK: "neutral" },
  itemKind: { PRODUCT: "neutral", SERVICE: "info" },
};

const STATUS_LABELS: Record<StatusKind, Record<string, string>> = {
  quote: QUOTE_STATUS_LABELS,
  saleDelivery: SALE_DELIVERY_STATUS_LABELS,
  salePayment: SALE_PAYMENT_STATUS_LABELS,
  purchase: PURCHASE_STATUS_LABELS,
  obligation: OBLIGATION_STATUS_LABELS,
  installment: INSTALLMENT_STATUS_LABELS,
  itemOrigin: ITEM_ORIGIN_LABELS,
  itemKind: ITEM_KIND_LABELS,
};

export interface StatusMetaOptions {
  serviceOnly?: boolean;
  overdue?: boolean;
}

export function statusMeta(
  kind: StatusKind,
  value: string | null | undefined,
  options: StatusMetaOptions = {},
): StatusMeta {
  if (!value) return { label: "—", tone: "neutral" };
  const tones = STATUS_TONES[kind] as Record<string, Tone>;
  const tone = options.overdue ? "danger" : (tones[value] ?? "neutral");
  const label =
    kind === "saleDelivery"
      ? saleDeliveryLabel(value as SaleDeliveryStatus, options.serviceOnly)
      : (STATUS_LABELS[kind][value] ?? "—");
  return { label, tone };
}
