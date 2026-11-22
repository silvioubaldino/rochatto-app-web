import type {
  InstallmentStatus,
  ObligationStatus,
  PurchaseStatus,
  QuoteStatus,
  SaleDeliveryStatus,
  SalePaymentStatus,
} from "../types";
import { STATUS_TONES, TONE_SUBTLE_CLASSES } from "./tones";

// Mapas `*_COLORS` das telas antigas, agora derivados do mapa único de tons (UX-P12).
// Código novo usa `<StatusBadge kind value />`; estes saem quando a última tela migrar.

function colors<K extends string>(tones: Record<K, keyof typeof TONE_SUBTLE_CLASSES>): Record<K, string> {
  return Object.fromEntries(
    Object.entries(tones).map(([k, t]) => [k, TONE_SUBTLE_CLASSES[t as keyof typeof TONE_SUBTLE_CLASSES]]),
  ) as Record<K, string>;
}

export const SALE_DELIVERY_STATUS_COLORS: Record<SaleDeliveryStatus, string> = colors(STATUS_TONES.saleDelivery);
export const SALE_PAYMENT_STATUS_COLORS: Record<SalePaymentStatus, string> = colors(STATUS_TONES.salePayment);
export const PURCHASE_STATUS_COLORS: Record<PurchaseStatus, string> = colors(STATUS_TONES.purchase);
export const QUOTE_STATUS_COLORS: Record<QuoteStatus, string> = colors(STATUS_TONES.quote);
export const OBLIGATION_STATUS_COLORS: Record<ObligationStatus, string> = colors(STATUS_TONES.obligation);
export const INSTALLMENT_STATUS_COLORS: Record<InstallmentStatus, string> = colors(STATUS_TONES.installment);
